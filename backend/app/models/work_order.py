import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from app.models.client import SyncStatus


class WorkOrderStatus(str, enum.Enum):
    DRAFT       = "draft"        # rascunho
    SCHEDULED   = "scheduled"    # agendada
    DISPATCHED  = "dispatched"   # técnico notificado
    IN_PROGRESS = "in_progress"  # técnico no local
    ON_HOLD     = "on_hold"      # pausada (aguarda peça, etc)
    COMPLETED   = "completed"    # concluída
    CANCELLED   = "cancelled"    # cancelada
    INVOICED    = "invoiced"     # faturada


class WorkOrderPriority(str, enum.Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id              = Column(Integer, primary_key=True, index=True)
    order_number    = Column(String, unique=True, index=True, nullable=True)

    # Relacionamentos
    client_id       = Column(Integer, ForeignKey("clients.id"), nullable=False)
    technician_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_id   = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Detalhes do serviço
    title           = Column(String, nullable=False)
    description     = Column(Text, nullable=True)
    service_type    = Column(String, nullable=True)   # install | repair | maintenance | inspection
    priority        = Column(Enum(WorkOrderPriority), default=WorkOrderPriority.MEDIUM)
    status          = Column(Enum(WorkOrderStatus), default=WorkOrderStatus.DRAFT)

    # Localização do serviço
    site_address    = Column(String, nullable=True)
    site_city       = Column(String, nullable=True)
    site_notes      = Column(Text, nullable=True)

    # Agendamento
    scheduled_start = Column(DateTime, nullable=True)
    scheduled_end   = Column(DateTime, nullable=True)
    actual_start    = Column(DateTime, nullable=True)
    actual_end      = Column(DateTime, nullable=True)

    # Financeiro
    cost_center     = Column(String, nullable=True)   # centro de custo
    estimated_hours = Column(Float, nullable=True)
    hourly_rate     = Column(Float, nullable=True)
    materials_cost  = Column(Float, default=0.0)
    total_cost      = Column(Float, nullable=True)

    # Checklists e equipamentos (JSON flexível)
    equipment       = Column(JSON, default=list)      # equipamentos no local
    checklist       = Column(JSON, default=list)      # itens a verificar

    # Salesforce sync — espelha Work Order object do SFS
    salesforce_id     = Column(String, nullable=True, index=True)
    sf_appointment_id = Column(String, nullable=True)   # Service Appointment ID
    sync_status       = Column(Enum(SyncStatus), default=SyncStatus.UNSYNCED)
    last_synced_at    = Column(DateTime, nullable=True)
    sync_error        = Column(Text, nullable=True)

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    client          = relationship("Client", back_populates="work_orders")
    technician      = relationship("User", foreign_keys=[technician_id], back_populates="work_orders")
    created_by      = relationship("User", foreign_keys=[created_by_id])
    timesheets      = relationship("TimeSheet", back_populates="work_order")
