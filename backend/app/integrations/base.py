"""
Abstract adapter that all external integration providers must implement.
Adding a new provider: subclass FieldServiceAdapter and register in sync_service.py.
"""
from abc import ABC, abstractmethod
from typing import Any, Optional


class FieldServiceAdapter(ABC):

    @abstractmethod
    async def push_work_order(self, work_order_id: int, payload: dict) -> dict:
        """
        Send a local Work Order to the external system.
        Returns the external record (must include 'external_id').
        """

    @abstractmethod
    async def push_timesheet(self, timesheet_id: int, payload: dict) -> dict:
        """
        Send a Time Sheet entry to the external system.
        Returns the external record.
        """

    @abstractmethod
    async def pull_work_orders(self, since_timestamp: Optional[str] = None) -> list[dict]:
        """
        Fetch Work Orders from the external system.
        since_timestamp is an ISO-8601 string for delta sync; None = full sync.
        """

    @abstractmethod
    async def pull_clients(self, since_timestamp: Optional[str] = None) -> list[dict]:
        """Fetch client/account records from the external system."""

    @abstractmethod
    async def health_check(self) -> dict:
        """
        Verify the connection is alive.
        Returns {"ok": bool, "latency_ms": int, "detail": str}.
        """
