import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, Text, ForeignKey, Float, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class InvoiceStatus(str, enum.Enum):
    DRAFT     = "draft"
    SENT      = "sent"
    PAID      = "paid"
    OVERDUE   = "overdue"
    CANCELLED = "cancelled"


class Invoice(Base):
    __tablename__ = "invoices"

    id              = Column(Integer, primary_key=True, index=True)
    invoice_number  = Column(String, unique=True, nullable=True, index=True)
    work_order_id   = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    client_id       = Column(Integer, ForeignKey("clients.id"), nullable=False)
    created_by_id   = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Line items: [{"description": "Labour - 3h @ $95/h", "qty": 3, "unit": "h", "rate": 95, "total": 285}]
    line_items      = Column(Text, default="[]")   # JSON stored as text for simplicity

    labour_hours    = Column(Float, default=0.0)
    hourly_rate     = Column(Float, default=0.0)
    labour_cost     = Column(Float, default=0.0)
    materials_cost  = Column(Float, default=0.0)
    subtotal        = Column(Float, default=0.0)
    gst_rate        = Column(Float, default=0.10)   # 10% GST — Australia
    gst_amount      = Column(Float, default=0.0)
    total           = Column(Float, default=0.0)

    status          = Column(Enum(InvoiceStatus, native_enum=False), default=InvoiceStatus.DRAFT)
    due_date        = Column(Date, nullable=True)
    paid_at         = Column(DateTime, nullable=True)
    notes           = Column(Text, nullable=True)

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    work_order  = relationship("WorkOrder", back_populates="invoices")
    client      = relationship("Client", back_populates="invoices")
    created_by  = relationship("User", foreign_keys=[created_by_id])
