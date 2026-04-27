from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_dispatcher, require_technician
from app.models.service_report import ServiceReport
from app.models.work_order import WorkOrder, WorkOrderStatus
from app.models.user import User, UserRole

router = APIRouter(prefix="/service-reports", tags=["Service Reports"])


class PartUsed(BaseModel):
    description: str
    qty: float
    unit_cost: float = 0.0


class ChecklistResult(BaseModel):
    item: str
    result: str   # pass | fail | na
    note: Optional[str] = None


class Reading(BaseModel):
    label: str
    value: str
    unit: Optional[str] = None


class ServiceReportOut(BaseModel):
    id: int
    work_order_id: int
    technician_id: int
    work_performed: Optional[str] = None
    recommendations: Optional[str] = None
    parts_used: list = []
    checklist_results: list = []
    readings: list = []
    client_signed_by: Optional[str] = None
    client_signed_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ServiceReportCreate(BaseModel):
    work_order_id: int
    work_performed: Optional[str] = None
    recommendations: Optional[str] = None
    parts_used: list[PartUsed] = []
    checklist_results: list[ChecklistResult] = []
    readings: list[Reading] = []
    tech_signature: Optional[str] = None
    client_signature: Optional[str] = None
    client_signed_by: Optional[str] = None


class ServiceReportUpdate(BaseModel):
    work_performed: Optional[str] = None
    recommendations: Optional[str] = None
    parts_used: Optional[list] = None
    checklist_results: Optional[list] = None
    readings: Optional[list] = None
    tech_signature: Optional[str] = None
    client_signature: Optional[str] = None
    client_signed_by: Optional[str] = None


@router.get("/work-order/{wo_id}", response_model=ServiceReportOut)
def get_by_work_order(
    wo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    report = db.query(ServiceReport).filter(ServiceReport.work_order_id == wo_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="No service report for this work order")
    return report


@router.post("/", response_model=ServiceReportOut, status_code=status.HTTP_201_CREATED)
def create_report(
    body: ServiceReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    wo = db.query(WorkOrder).filter(WorkOrder.id == body.work_order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Technicians can only report on their own orders
    if current_user.role == UserRole.TECHNICIAN and wo.technician_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your work order")

    if db.query(ServiceReport).filter(ServiceReport.work_order_id == body.work_order_id).first():
        raise HTTPException(status_code=409, detail="Service report already exists")

    now = datetime.utcnow()
    report = ServiceReport(
        work_order_id=body.work_order_id,
        technician_id=current_user.id,
        work_performed=body.work_performed,
        recommendations=body.recommendations,
        parts_used=[p.model_dump() for p in body.parts_used],
        checklist_results=[c.model_dump() for c in body.checklist_results],
        readings=[r.model_dump() for r in body.readings],
        tech_signature=body.tech_signature,
        client_signature=body.client_signature,
        client_signed_by=body.client_signed_by,
        client_signed_at=now if body.client_signed_by else None,
        completed_at=now,
    )
    db.add(report)

    # Auto-advance WO to completed
    if wo.status == WorkOrderStatus.IN_PROGRESS:
        wo.status = WorkOrderStatus.COMPLETED
        wo.actual_end = now

    db.commit()
    db.refresh(report)
    return report


@router.patch("/{report_id}", response_model=ServiceReportOut)
def update_report(
    report_id: int,
    body: ServiceReportUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician),
):
    report = db.query(ServiceReport).filter(ServiceReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(report, field, value)

    if body.client_signed_by and not report.client_signed_at:
        report.client_signed_at = datetime.utcnow()

    db.commit()
    db.refresh(report)
    return report
