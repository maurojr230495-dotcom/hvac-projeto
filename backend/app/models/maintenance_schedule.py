import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, Text, ForeignKey, Float, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ScheduleFrequency(str, enum.Enum):
    WEEKLY        = "weekly"
    FORTNIGHTLY   = "fortnightly"
    MONTHLY       = "monthly"
    QUARTERLY     = "quarterly"    # every 3 months
    BIANNUAL      = "biannual"     # every 6 months
    ANNUAL        = "annual"


class MaintenanceSchedule(Base):
    """Recurring preventive maintenance plan for an asset."""
    __tablename__ = "maintenance_schedules"

    id                      = Column(Integer, primary_key=True, index=True)
    asset_id                = Column(Integer, ForeignKey("assets.id"), nullable=True)
    client_id               = Column(Integer, ForeignKey("clients.id"), nullable=False)
    preferred_technician_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    title           = Column(String, nullable=False)
    description     = Column(Text, nullable=True)
    service_type    = Column(String, nullable=True)   # maintenance | inspection | etc
    frequency       = Column(Enum(ScheduleFrequency, native_enum=False), nullable=False)
    estimated_hours = Column(Float, nullable=True)
    hourly_rate     = Column(Float, nullable=True)

    is_active       = Column(Boolean, default=True)
    start_date      = Column(Date, nullable=True)
    next_due_date   = Column(Date, nullable=True)
    last_generated_at = Column(DateTime, nullable=True)

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    asset                = relationship("Asset", back_populates="maintenance_schedules")
    client               = relationship("Client", back_populates="maintenance_schedules")
    preferred_technician = relationship("User", foreign_keys=[preferred_technician_id])
