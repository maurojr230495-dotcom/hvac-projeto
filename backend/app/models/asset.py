import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class AssetType(str, enum.Enum):
    SPLIT_SYSTEM   = "split_system"
    DUCTED         = "ducted"
    VRV_VRF        = "vrv_vrf"
    CHILLER        = "chiller"
    COOLING_TOWER  = "cooling_tower"
    AHU            = "ahu"       # Air Handling Unit
    FCU            = "fcu"       # Fan Coil Unit
    BOILER         = "boiler"
    HEAT_PUMP      = "heat_pump"
    OTHER          = "other"


class Asset(Base):
    __tablename__ = "assets"

    id               = Column(Integer, primary_key=True, index=True)
    client_id        = Column(Integer, ForeignKey("clients.id"), nullable=False)

    name             = Column(String, nullable=False)        # "Rooftop Unit #1"
    asset_type       = Column(Enum(AssetType, native_enum=False), nullable=False)
    brand            = Column(String, nullable=True)
    model            = Column(String, nullable=True)
    serial_number    = Column(String, nullable=True, index=True)
    capacity_kw      = Column(String, nullable=True)         # "12.5 kW"
    refrigerant      = Column(String, nullable=True)         # "R-410A"
    location         = Column(String, nullable=True)         # "Level 3, Server Room"

    installation_date = Column(Date, nullable=True)
    warranty_expiry   = Column(Date, nullable=True)

    last_service_date = Column(Date, nullable=True)
    next_service_due  = Column(Date, nullable=True)

    notes            = Column(Text, nullable=True)
    is_active        = Column(Boolean, default=True)

    # Salesforce Asset object sync
    salesforce_id    = Column(String, nullable=True, index=True)

    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    client           = relationship("Client", back_populates="assets")
    work_orders      = relationship("WorkOrder", back_populates="asset")
    maintenance_schedules = relationship("MaintenanceSchedule", back_populates="asset")
