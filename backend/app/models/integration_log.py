import enum
from sqlalchemy import Column, Integer, String, Enum, DateTime, Text, JSON
from datetime import datetime
from app.database import Base


class SyncDirection(str, enum.Enum):
    OUTBOUND = "outbound"   # nosso sistema → Salesforce
    INBOUND  = "inbound"    # Salesforce → nosso sistema


class SyncStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    ERROR   = "error"
    SKIPPED = "skipped"


class IntegrationLog(Base):
    """Rastreia cada tentativa de sync com sistemas externos (Salesforce, etc)."""
    __tablename__ = "integration_logs"

    id          = Column(Integer, primary_key=True, index=True)
    provider    = Column(String, nullable=False)         # salesforce | hubspot | …
    direction   = Column(Enum(SyncDirection), nullable=False)
    entity      = Column(String, nullable=False)         # work_order | timesheet | client
    entity_id   = Column(Integer, nullable=True)
    external_id = Column(String, nullable=True)          # ID no sistema externo
    status      = Column(Enum(SyncStatus), nullable=False)
    payload     = Column(JSON, nullable=True)            # dados enviados/recebidos
    response    = Column(JSON, nullable=True)            # resposta do sistema externo
    error       = Column(Text, nullable=True)
    duration_ms = Column(Integer, nullable=True)         # tempo da chamada em ms
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)
