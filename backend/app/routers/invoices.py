import json
from typing import Optional
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_dispatcher, require_manager
from app.models.invoice import Invoice, InvoiceStatus
from app.models.work_order import WorkOrder
from app.models.user import User

router = APIRouter(prefix="/invoices", tags=["Invoices"])


class LineItem(BaseModel):
    description: str
    qty: float
    unit: str = "each"
    rate: float
    total: float


class InvoiceOut(BaseModel):
    id: int
    invoice_number: Optional[str] = None
    work_order_id: int
    client_id: int
    labour_hours: float
    hourly_rate: float
    labour_cost: float
    materials_cost: float
    subtotal: float
    gst_rate: float
    gst_amount: float
    total: float
    status: str
    due_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InvoiceCreate(BaseModel):
    work_order_id: int
    line_items: list[LineItem] = []
    materials_cost: float = 0.0
    gst_rate: float = 0.10
    due_days: int = 30          # payment terms
    notes: Optional[str] = None


class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    paid_at: Optional[datetime] = None
    notes: Optional[str] = None
    due_date: Optional[date] = None


@router.get("/", response_model=list[InvoiceOut])
def list_invoices(
    client_id: Optional[int] = None,
    inv_status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_dispatcher),
):
    q = db.query(Invoice)
    if client_id:
        q = q.filter(Invoice.client_id == client_id)
    if inv_status:
        q = q.filter(Invoice.status == inv_status)
    return q.order_by(Invoice.created_at.desc()).all()


@router.get("/{inv_id}", response_model=InvoiceOut)
def get_invoice(inv_id: int, db: Session = Depends(get_db), _: User = Depends(require_dispatcher)):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.post("/from-work-order/{wo_id}", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_from_work_order(
    wo_id: int,
    body: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_dispatcher),
):
    """Generate an invoice directly from a completed work order."""
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    # Build line items from work order + provided items
    items = [item.model_dump() for item in body.line_items]

    # Auto-add labour line from timesheets if none provided
    if not items and wo.estimated_hours and wo.hourly_rate:
        items.append({
            "description": f"Labour — {wo.estimated_hours}h @ ${wo.hourly_rate}/h",
            "qty": wo.estimated_hours,
            "unit": "h",
            "rate": wo.hourly_rate,
            "total": round(wo.estimated_hours * wo.hourly_rate, 2),
        })

    labour_cost = sum(i["total"] for i in items)
    subtotal = labour_cost + body.materials_cost
    gst = round(subtotal * body.gst_rate, 2)
    total = round(subtotal + gst, 2)

    inv = Invoice(
        work_order_id=wo_id,
        client_id=wo.client_id,
        created_by_id=current_user.id,
        line_items=json.dumps(items),
        labour_hours=sum(i["qty"] for i in items if i.get("unit") == "h"),
        hourly_rate=wo.hourly_rate or 0,
        labour_cost=labour_cost,
        materials_cost=body.materials_cost,
        subtotal=subtotal,
        gst_rate=body.gst_rate,
        gst_amount=gst,
        total=total,
        notes=body.notes,
        due_date=date.today() + timedelta(days=body.due_days),
    )
    db.add(inv)
    db.flush()
    inv.invoice_number = f"INV-{inv.id:06d}"
    db.commit()
    db.refresh(inv)
    return inv


@router.patch("/{inv_id}", response_model=InvoiceOut)
def update_invoice(
    inv_id: int,
    body: InvoiceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dispatcher),
):
    inv = db.query(Invoice).filter(Invoice.id == inv_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(inv, field, value)
    db.commit()
    db.refresh(inv)
    return inv
