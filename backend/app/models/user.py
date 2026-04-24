import enum
from sqlalchemy import Column, Integer, String, Boolean, Enum, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class UserRole(str, enum.Enum):
    ADMIN       = "admin"        # acesso total
    MANAGER     = "manager"      # vê equipes, relatórios, custos
    DISPATCHER  = "dispatcher"   # agenda, aloca técnicos, vê mapa
    TECHNICIAN  = "technician"   # só as próprias OS e jornada


class AuthProvider(str, enum.Enum):
    LOCAL     = "local"      # email + senha
    MICROSOFT = "microsoft"  # Entra ID / Azure AD


class User(Base):
    __tablename__ = "users"

    id                = Column(Integer, primary_key=True, index=True)
    name              = Column(String, nullable=False)
    email             = Column(String, unique=True, index=True, nullable=False)

    # Auth local
    hashed_password   = Column(String, nullable=True)   # null se só usa Microsoft

    # Auth Microsoft Entra ID
    microsoft_id      = Column(String, unique=True, nullable=True, index=True)
    auth_provider     = Column(Enum(AuthProvider, native_enum=False), default=AuthProvider.LOCAL)

    # RBAC
    role              = Column(Enum(UserRole, native_enum=False), default=UserRole.TECHNICIAN, nullable=False)
    is_active         = Column(Boolean, default=True)

    # Perfil do técnico (usado quando role == TECHNICIAN)
    phone             = Column(String, nullable=True)
    skills            = Column(JSON, default=list)      # ["hvac_install", "hvac_repair", …]
    territory         = Column(String, nullable=True)   # zona de atuação

    # Auditoria
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at     = Column(DateTime, nullable=True)

    # Relacionamentos
    work_orders       = relationship("WorkOrder", back_populates="technician", foreign_keys="WorkOrder.technician_id")
    timesheets        = relationship("TimeSheet", back_populates="technician", foreign_keys="TimeSheet.technician_id")
