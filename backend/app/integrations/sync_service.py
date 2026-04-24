"""
Orchestrates sync operations between local DB and external adapters.
Currently only Salesforce is wired up; add more adapters as needed.
"""
import time
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.integrations.salesforce.adapter import salesforce_adapter
from app.models.integration_log import IntegrationLog, SyncDirection, SyncStatus
from app.models.work_order import WorkOrder
from app.models.client import SyncStatus as ModelSyncStatus


def _log_sync(
    db: Session,
    *,
    provider: str,
    direction: SyncDirection,
    entity: str,
    entity_id: int,
    external_id: str | None,
    status: SyncStatus,
    payload: dict | None = None,
    response: dict | None = None,
    error: str | None = None,
    duration_ms: int | None = None,
) -> None:
    entry = IntegrationLog(
        provider=provider,
        direction=direction,
        entity=entity,
        entity_id=entity_id,
        external_id=external_id,
        status=status,
        payload=payload,
        response=response,
        error=error,
        duration_ms=duration_ms,
    )
    db.add(entry)
    db.commit()


async def push_work_order_to_salesforce(db: Session, work_order_id: int) -> None:
    wo = db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()
    if not wo:
        return

    payload = {
        "title": wo.title,
        "description": wo.description,
        "status": wo.status.value,
        "priority": wo.priority.value,
        "site_address": wo.site_address,
        "site_city": wo.site_city,
        "scheduled_start": wo.scheduled_start.isoformat() if wo.scheduled_start else None,
        "scheduled_end": wo.scheduled_end.isoformat() if wo.scheduled_end else None,
    }

    start = time.perf_counter()
    try:
        result = await salesforce_adapter.push_work_order(work_order_id, payload)
        duration_ms = int((time.perf_counter() - start) * 1000)

        wo.salesforce_id = result.get("external_id")
        wo.sync_status = ModelSyncStatus.SYNCED
        wo.last_synced_at = datetime.now(timezone.utc)
        wo.sync_error = None
        db.commit()

        _log_sync(
            db,
            provider="salesforce",
            direction=SyncDirection.OUTBOUND,
            entity="work_order",
            entity_id=work_order_id,
            external_id=wo.salesforce_id,
            status=SyncStatus.SUCCESS,
            payload=payload,
            response=result,
            duration_ms=duration_ms,
        )
    except Exception as exc:
        duration_ms = int((time.perf_counter() - start) * 1000)
        wo.sync_status = ModelSyncStatus.ERROR
        wo.sync_error = str(exc)
        db.commit()

        _log_sync(
            db,
            provider="salesforce",
            direction=SyncDirection.OUTBOUND,
            entity="work_order",
            entity_id=work_order_id,
            external_id=wo.salesforce_id,
            status=SyncStatus.ERROR,
            payload=payload,
            error=str(exc),
            duration_ms=duration_ms,
        )
        raise
