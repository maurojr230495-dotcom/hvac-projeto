from typing import Optional
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_dispatcher, require_manager
from app.models.maintenance_schedule import MaintenanceSchedule, ScheduleFrequency
from app.models.work_order import WorkOrder, WorkOrderStatus, WorkOrderPriority
from app.models.user import User

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

# Frequency → delta
_DELTA = {
    ScheduleFrequency.WEEKLY:      relativedelta(weeks=1),
    ScheduleFrequency.FORTNIGHTLY: relativedelta(weeks=2),
    ScheduleFrequency.MONTHLY:     relativedelta(months=1),
    ScheduleFrequency.QUARTERLY:   relativedelta(months=3),
    ScheduleFrequency.BIANNUAL:    relativedelta(months=6),
    ScheduleFrequency.ANNUAL:      relativedelta(years=1),
}


class ScheduleOut(BaseModel):
    id: int
    asset_id: Optional[int] = None
    client_id: int
    preferred_technician_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    service_type: Optional[str] = None
    frequency: str
    estimated_hours: Optional[float] = None
    is_active: bool
    next_due_date: Optional[date] = None
    last_generated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ScheduleCreate(BaseModel):
    asset_id: Optional[int] = None
    client_id: int
    preferred_technician_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    service_type: Optional[str] = "maintenance"
    frequency: ScheduleFrequency
    estimated_hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    start_date: Optional[date] = None


class ScheduleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    frequency: Optional[ScheduleFrequency] = None
    estimated_hours: Optional[float] = None
    preferred_technician_id: Optional[int] = None
    next_due_date: Optional[date] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=list[ScheduleOut])
def list_schedules(
    client_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    _: User = Depends(require_dispatcher),
):
    q = db.query(MaintenanceSchedule)
    if client_id:
        q = q.filter(MaintenanceSchedule.client_id == client_id)
    if is_active is not None:
        q = q.filter(MaintenanceSchedule.is_active == is_active)
    return q.order_by(MaintenanceSchedule.next_due_date).all()


@router.post("/", response_model=ScheduleOut, status_code=status.HTTP_201_CREATED)
def create_schedule(
    body: ScheduleCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dispatcher),
):
    start = body.start_date or date.today()
    delta = _DELTA[body.frequency]
    next_due = date(start.year, start.month, start.day) + delta

    sched = MaintenanceSchedule(
        **body.model_dump(exclude={"start_date"}),
        start_date=start,
        next_due_date=next_due,
    )
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return sched


@router.patch("/{sched_id}", response_model=ScheduleOut)
def update_schedule(
    sched_id: int,
    body: ScheduleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dispatcher),
):
    sched = db.query(MaintenanceSchedule).filter(MaintenanceSchedule.id == sched_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(sched, field, value)
    db.commit()
    db.refresh(sched)
    return sched


@router.post("/{sched_id}/generate", status_code=status.HTTP_201_CREATED)
def generate_work_order(
    sched_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dispatcher),
):
    """Generate the next scheduled work order from a maintenance plan."""
    sched = db.query(MaintenanceSchedule).filter(MaintenanceSchedule.id == sched_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if not sched.is_active:
        raise HTTPException(status_code=400, detail="Schedule is inactive")

    wo = WorkOrder(
        client_id=sched.client_id,
        asset_id=sched.asset_id,
        technician_id=sched.preferred_technician_id,
        created_by_id=current_user.id,
        title=sched.title,
        description=sched.description,
        service_type=sched.service_type or "maintenance",
        priority=WorkOrderPriority.MEDIUM,
        status=WorkOrderStatus.SCHEDULED,
        estimated_hours=sched.estimated_hours,
        hourly_rate=sched.hourly_rate,
    )
    db.add(wo)
    db.flush()
    wo.order_number = f"WO-{wo.id:06d}"

    # Advance schedule to next occurrence
    delta = _DELTA[sched.frequency]
    now = datetime.utcnow()
    sched.last_generated_at = now
    if sched.next_due_date:
        next_d = sched.next_due_date + delta
    else:
        next_d = date.today() + delta
    sched.next_due_date = next_d

    db.commit()
    db.refresh(wo)
    return {"work_order_id": wo.id, "order_number": wo.order_number, "next_due_date": str(next_d)}


@router.get("/upcoming", response_model=list[ScheduleOut])
def upcoming_schedules(
    days: int = 30,
    db: Session = Depends(get_db),
    _: User = Depends(require_dispatcher),
):
    """Schedules due in the next N days."""
    cutoff = date.today() + timedelta(days=days)
    return (
        db.query(MaintenanceSchedule)
        .filter(
            MaintenanceSchedule.is_active == True,
            MaintenanceSchedule.next_due_date <= cutoff,
        )
        .order_by(MaintenanceSchedule.next_due_date)
        .all()
    )
