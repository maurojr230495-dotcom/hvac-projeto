from typing import Optional
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_dispatcher, require_technician
from app.models.asset import Asset, AssetType
from app.models.user import User

router = APIRouter(prefix="/assets", tags=["Assets"])


class AssetOut(BaseModel):
    id: int
    client_id: int
    name: str
    asset_type: str
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    capacity_kw: Optional[str] = None
    refrigerant: Optional[str] = None
    location: Optional[str] = None
    installation_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    last_service_date: Optional[date] = None
    next_service_due: Optional[date] = None
    is_active: bool
    salesforce_id: Optional[str] = None

    class Config:
        from_attributes = True


class AssetCreate(BaseModel):
    client_id: int
    name: str
    asset_type: AssetType
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    capacity_kw: Optional[str] = None
    refrigerant: Optional[str] = None
    location: Optional[str] = None
    installation_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    next_service_due: Optional[date] = None
    notes: Optional[str] = None


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    asset_type: Optional[AssetType] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    capacity_kw: Optional[str] = None
    refrigerant: Optional[str] = None
    location: Optional[str] = None
    installation_date: Optional[date] = None
    warranty_expiry: Optional[date] = None
    last_service_date: Optional[date] = None
    next_service_due: Optional[date] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/", response_model=list[AssetOut])
def list_assets(
    client_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    db: Session = Depends(get_db),
    _: User = Depends(require_technician),
):
    q = db.query(Asset)
    if client_id:
        q = q.filter(Asset.client_id == client_id)
    if is_active is not None:
        q = q.filter(Asset.is_active == is_active)
    return q.order_by(Asset.name).all()


@router.get("/{asset_id}", response_model=AssetOut)
def get_asset(asset_id: int, db: Session = Depends(get_db), _: User = Depends(require_technician)):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.post("/", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
def create_asset(body: AssetCreate, db: Session = Depends(get_db), _: User = Depends(require_dispatcher)):
    from app.models.client import Client
    if not db.query(Client).filter(Client.id == body.client_id).first():
        raise HTTPException(status_code=404, detail="Client not found")
    asset = Asset(**body.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.patch("/{asset_id}", response_model=AssetOut)
def update_asset(
    asset_id: int,
    body: AssetUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_dispatcher),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset
