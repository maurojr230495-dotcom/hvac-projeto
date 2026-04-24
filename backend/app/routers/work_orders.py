from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_dispatcher, require_technician
from app.models.work_order import WorkOrder, WorkOrderStatus, WorkOrderPriority
from app.models.user import User, UserRole

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])


class WorkOrderOut(BaseModel):
    id: int
    order_number: Optional[str] = None
    client_id: int
    technician_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    service_type: Optional[str] = None
    priority: str
    status: str
    site_address: Optional[str] = None
    site_city: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    cost_center: Optional[str] = None
    estimated_hours: Optional[float] = None
    materials_cost: Optional[float] = None
    total_cost: Optional[float] = None
    salesforce_id: Optional[str] = None
    sync_status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkOrderCreate(BaseModel):
    client_id: int
    title: str
    description: Optional[str] = None
    service_type: Optional[str] = None
    priority: WorkOrderPriority = WorkOrderPriority.MEDIUM
    site_address: Optional[str] = None
    site_city: Optional[str] = None
    site_notes: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    cost_center: Optional[str] = None
    estimated_hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    technician_id: Optional[int] = None


class WorkOrderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    service_type: Optional[str] = None
    priority: Optional[WorkOrderPriority] = None
    status: Optional[WorkOrderStatus] = None
    technician_id: Optional[int] = None
    site_address: Optional[str] = None
    site_city: Optional[str] = None
    site_notes: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    cost_center: Optional[str] = None
    estimated_hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    materials_cost: Optional[float] = None
    total_cost: Optional[float] = None
    checklist: Optional[list] = None
    equipment: Optional[list] = None


def _can_see_order(user: User, wo: WorkOrder) -> bool:
    if user.role in (UserRole.ADMIN, UserRole.MANAGER, UserRole.DISPATCHER):
        return True
    return wo.technician_id == user.id


@router.get("/", response_model=list[WorkOrderOut])
def list_work_orders(
    status: Optional[str] = None,
    technician_id: Optional[int] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    query = db.query(WorkOrder)

    # Technicians see only their own orders
    if current_user.role == UserRole.TECHNICIAN:
        query = query.filter(WorkOrder.technician_id == current_user.id)
    else:
        if technician_id:
            query = query.filter(WorkOrder.technician_id == technician_id)
        if client_id:
            query = query.filter(WorkOrder.client_id == client_id)

    if status:
        query = query.filter(WorkOrder.status == status)

    return query.order_by(WorkOrder.scheduled_start.desc()).all()


@router.get("/{wo_id}", response_model=WorkOrderOut)
def get_work_order(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    if not _can_see_order(current_user, wo):
        raise HTTPException(status_code=403, detail="Access denied")
    return wo


@router.post("/", response_model=WorkOrderOut, status_code=status.HTTP_201_CREATED)
def create_work_order(
    body: WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dispatcher),
):
    from app.models.client import Client
    if not db.query(Client).filter(Client.id == body.client_id).first():
        raise HTTPException(status_code=404, detail="Client not found")

    wo = WorkOrder(**body.model_dump(), created_by_id=current_user.id)
    db.add(wo)
    db.flush()

    # Auto-generate order number
    wo.order_number = f"WO-{wo.id:06d}"
    db.commit()
    db.refresh(wo)
    return wo


@router.patch("/{wo_id}", response_model=WorkOrderOut)
def update_work_order(
    wo_id: int,
    body: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dispatcher),
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(wo, field, value)
    db.commit()
    db.refresh(wo)
    return wo


@router.delete("/{wo_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_work_order(
    wo_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_dispatcher),
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    wo.status = WorkOrderStatus.CANCELLED
    db.commit()
