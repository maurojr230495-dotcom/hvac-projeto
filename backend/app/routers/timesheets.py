from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_technician, require_manager
from app.models.timesheet import TimeSheet, TimesheetStatus, ActivityType
from app.models.user import User, UserRole

router = APIRouter(prefix="/timesheets", tags=["Timesheets"])


class TimesheetOut(BaseModel):
    id: int
    work_order_id: int
    technician_id: int
    cost_center: str
    activity_type: str
    description: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    paused_minutes: int
    total_hours: Optional[float] = None
    checkin_lat: Optional[float] = None
    checkin_lng: Optional[float] = None
    checkout_lat: Optional[float] = None
    checkout_lng: Optional[float] = None
    status: str
    approved_by_id: Optional[int] = None
    approved_at: Optional[datetime] = None
    rejection_note: Optional[str] = None
    salesforce_id: Optional[str] = None
    sync_status: str

    class Config:
        from_attributes = True


class TimesheetCheckin(BaseModel):
    work_order_id: int
    cost_center: str
    activity_type: ActivityType
    description: Optional[str] = None
    checkin_lat: Optional[float] = None
    checkin_lng: Optional[float] = None


class TimesheetCheckout(BaseModel):
    checkout_lat: Optional[float] = None
    checkout_lng: Optional[float] = None


class TimesheetReview(BaseModel):
    approve: bool
    rejection_note: Optional[str] = None


def _calc_hours(ts: TimeSheet) -> float:
    if not ts.ended_at:
        return 0.0
    total_minutes = (ts.ended_at - ts.started_at).total_seconds() / 60
    return round((total_minutes - ts.paused_minutes) / 60, 2)


@router.get("/", response_model=list[TimesheetOut])
def list_timesheets(
    work_order_id: Optional[int] = None,
    technician_id: Optional[int] = None,
    ts_status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    query = db.query(TimeSheet)
    if current_user.role == UserRole.TECHNICIAN:
        query = query.filter(TimeSheet.technician_id == current_user.id)
    else:
        if technician_id:
            query = query.filter(TimeSheet.technician_id == technician_id)
    if work_order_id:
        query = query.filter(TimeSheet.work_order_id == work_order_id)
    if ts_status:
        query = query.filter(TimeSheet.status == ts_status)
    return query.order_by(TimeSheet.started_at.desc()).all()


@router.post("/checkin", response_model=TimesheetOut, status_code=status.HTTP_201_CREATED)
def checkin(
    body: TimesheetCheckin,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    # Only one active sheet per technician at a time
    active = db.query(TimeSheet).filter(
        TimeSheet.technician_id == current_user.id,
        TimeSheet.status == TimesheetStatus.ACTIVE,
    ).first()
    if active:
        raise HTTPException(status_code=409, detail="Already have an active timesheet. Check out first.")

    ts = TimeSheet(
        work_order_id=body.work_order_id,
        technician_id=current_user.id,
        cost_center=body.cost_center,
        activity_type=body.activity_type,
        description=body.description,
        started_at=datetime.now(timezone.utc),
        checkin_lat=body.checkin_lat,
        checkin_lng=body.checkin_lng,
        status=TimesheetStatus.ACTIVE,
    )
    db.add(ts)
    db.commit()
    db.refresh(ts)
    return ts


@router.post("/{ts_id}/checkout", response_model=TimesheetOut)
def checkout(
    ts_id: int,
    body: TimesheetCheckout,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    ts = db.query(TimeSheet).filter(TimeSheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if ts.technician_id != current_user.id and current_user.role == UserRole.TECHNICIAN:
        raise HTTPException(status_code=403, detail="Access denied")
    if ts.status not in (TimesheetStatus.ACTIVE, TimesheetStatus.PAUSED):
        raise HTTPException(status_code=400, detail=f"Cannot checkout from status: {ts.status}")

    ts.ended_at = datetime.now(timezone.utc)
    ts.checkout_lat = body.checkout_lat
    ts.checkout_lng = body.checkout_lng
    ts.status = TimesheetStatus.COMPLETED
    ts.total_hours = _calc_hours(ts)
    db.commit()
    db.refresh(ts)
    return ts


@router.post("/{ts_id}/review", response_model=TimesheetOut)
def review_timesheet(
    ts_id: int,
    body: TimesheetReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager),
):
    ts = db.query(TimeSheet).filter(TimeSheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if ts.status != TimesheetStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Only completed timesheets can be reviewed")

    if body.approve:
        ts.status = TimesheetStatus.APPROVED
        ts.approved_by_id = current_user.id
        ts.approved_at = datetime.now(timezone.utc)
        ts.rejection_note = None
    else:
        if not body.rejection_note:
            raise HTTPException(status_code=400, detail="rejection_note required when rejecting")
        ts.status = TimesheetStatus.REJECTED
        ts.rejection_note = body.rejection_note

    db.commit()
    db.refresh(ts)
    return ts
