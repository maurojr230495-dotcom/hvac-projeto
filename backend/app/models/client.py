import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class SyncStatus(str, enum.Enum):
    UNSYNCED  = "unsynced"
    PENDING   = "pending"
    SYNCED    = "synced"
    ERROR     = "error"
    CONFLICT  = "conflict"


class Client(Base):
    __tablename__ = "clients"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    company       = Column(String, nullable=True)
    email         = Column(String, nullable=True)
    phone         = Column(String, nullable=True)
    address       = Column(String, nullable=True)
    city          = Column(String, nullable=True)
    state         = Column(String, nullable=True)
    postcode      = Column(String, nullable=True)
    country       = Column(String, default="AU")
    notes         = Column(Text, nullable=True)
    is_active     = Column(Boolean, default=True)

    # Salesforce sync
    salesforce_id   = Column(String, nullable=True, index=True)
    sync_status     = Column(Enum(SyncStatus, native_enum=False), default=SyncStatus.UNSYNCED)
    last_synced_at  = Column(DateTime, nullable=True)
    sync_error      = Column(Text, nullable=True)

    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    work_orders   = relationship("WorkOrder", back_populates="client")
