from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ServiceReport(Base):
    """Completion form filled by technician at end of job."""
    __tablename__ = "service_reports"

    id              = Column(Integer, primary_key=True, index=True)
    work_order_id   = Column(Integer, ForeignKey("work_orders.id"), unique=True, nullable=False)
    technician_id   = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Work summary
    work_performed   = Column(Text, nullable=True)
    recommendations  = Column(Text, nullable=True)

    # Parts used: [{"description": "Filter 16x20", "qty": 2, "unit_cost": 22.50}]
    parts_used       = Column(JSON, default=list)

    # Checklist results: [{"item": "Check refrigerant level", "result": "pass|fail|na", "note": ""}]
    checklist_results = Column(JSON, default=list)

    # Readings: [{"label": "Suction pressure", "value": "68 psi", "unit": "psi"}]
    readings         = Column(JSON, default=list)

    # Digital signatures (SVG data URI or URL)
    tech_signature    = Column(Text, nullable=True)
    client_signature  = Column(Text, nullable=True)
    client_signed_by  = Column(String, nullable=True)   # name of person who signed
    client_signed_at  = Column(DateTime, nullable=True)

    completed_at      = Column(DateTime, default=datetime.utcnow)
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    work_order  = relationship("WorkOrder", back_populates="service_report")
    technician  = relationship("User", foreign_keys=[technician_id])
