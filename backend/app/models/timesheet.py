import enum
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base
from app.models.client import SyncStatus


class TimesheetStatus(str, enum.Enum):
    ACTIVE      = "active"      # técnico está trabalhando agora
    PAUSED      = "paused"      # pausado (almoço, deslocamento, etc)
    COMPLETED   = "completed"   # jornada encerrada
    APPROVED    = "approved"    # aprovado pelo manager
    REJECTED    = "rejected"    # rejeitado, técnico deve corrigir


class ActivityType(str, enum.Enum):
    TRAVEL          = "travel"           # deslocamento
    INSTALLATION    = "installation"     # instalação
    REPAIR          = "repair"           # reparo
    MAINTENANCE     = "maintenance"      # manutenção preventiva
    INSPECTION      = "inspection"       # vistoria
    COMMISSIONING   = "commissioning"    # comissionamento
    TRAINING        = "training"         # treinamento no local
    ADMIN           = "admin"            # atividade administrativa
    OTHER           = "other"            # outro


class TimeSheet(Base):
    __tablename__ = "timesheets"

    id              = Column(Integer, primary_key=True, index=True)

    # Relacionamentos
    work_order_id   = Column(Integer, ForeignKey("work_orders.id"), nullable=False)
    technician_id   = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Centro de custo — base para cobrança e pagamento
    cost_center     = Column(String, nullable=False)

    # Atividade
    activity_type   = Column(Enum(ActivityType, native_enum=False), nullable=False)
    description     = Column(Text, nullable=True)

    # Jornada
    started_at      = Column(DateTime, nullable=False)
    ended_at        = Column(DateTime, nullable=True)
    paused_minutes  = Column(Integer, default=0)      # minutos pausados total
    total_hours     = Column(Float, nullable=True)    # calculado ao encerrar

    # Localização GPS (check-in / check-out)
    checkin_lat     = Column(Float, nullable=True)
    checkin_lng     = Column(Float, nullable=True)
    checkout_lat    = Column(Float, nullable=True)
    checkout_lng    = Column(Float, nullable=True)

    # Aprovação
    status          = Column(Enum(TimesheetStatus, native_enum=False), default=TimesheetStatus.ACTIVE)
    approved_by_id  = Column(Integer, ForeignKey("users.id"), nullable=True)
    approved_at     = Column(DateTime, nullable=True)
    rejection_note  = Column(Text, nullable=True)

    # Salesforce sync — espelha Time Sheet do SFS
    salesforce_id   = Column(String, nullable=True, index=True)
    sync_status     = Column(Enum(SyncStatus, native_enum=False), default=SyncStatus.UNSYNCED)
    last_synced_at  = Column(DateTime, nullable=True)
    sync_error      = Column(Text, nullable=True)

    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    work_order      = relationship("WorkOrder", back_populates="timesheets")
    technician      = relationship("User", foreign_keys=[technician_id], back_populates="timesheets")
    approved_by     = relationship("User", foreign_keys=[approved_by_id])
