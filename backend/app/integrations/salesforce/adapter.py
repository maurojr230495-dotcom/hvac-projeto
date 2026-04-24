"""
Salesforce Field Service adapter — STUB.

All methods raise NotImplementedError until SF credentials are configured
and this integration is activated. Set SF_CLIENT_ID in .env to enable.

To implement:
  1. Add `simple_salesforce` to requirements.txt
  2. Replace stubs below with real REST/Bulk API calls
  3. Set SF_* env vars in production secrets
"""
import time
from typing import Optional

from app.config import settings
from app.integrations.base import FieldServiceAdapter


class SalesforceAdapter(FieldServiceAdapter):

    def _assert_configured(self) -> None:
        if not settings.SF_CLIENT_ID:
            raise NotImplementedError(
                "Salesforce integration is not configured. "
                "Set SF_CLIENT_ID, SF_CLIENT_SECRET, SF_INSTANCE_URL in your .env"
            )

    async def push_work_order(self, work_order_id: int, payload: dict) -> dict:
        self._assert_configured()
        # TODO: POST to /services/data/vXX.0/sobjects/WorkOrder/
        raise NotImplementedError

    async def push_timesheet(self, timesheet_id: int, payload: dict) -> dict:
        self._assert_configured()
        # TODO: POST to /services/data/vXX.0/sobjects/TimeSheet/
        raise NotImplementedError

    async def pull_work_orders(self, since_timestamp: Optional[str] = None) -> list[dict]:
        self._assert_configured()
        # TODO: SOQL SELECT ... FROM WorkOrder WHERE LastModifiedDate > :since
        raise NotImplementedError

    async def pull_clients(self, since_timestamp: Optional[str] = None) -> list[dict]:
        self._assert_configured()
        # TODO: SOQL SELECT ... FROM Account WHERE LastModifiedDate > :since
        raise NotImplementedError

    async def health_check(self) -> dict:
        if not settings.SF_CLIENT_ID:
            return {"ok": False, "latency_ms": 0, "detail": "Not configured"}
        # TODO: GET /services/data/ — check API version list responds
        return {"ok": False, "latency_ms": 0, "detail": "Stub — not implemented"}


# Singleton instance used by sync_service
salesforce_adapter = SalesforceAdapter()
