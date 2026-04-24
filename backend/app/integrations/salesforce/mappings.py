"""
Maps between our internal models and Salesforce Field Service objects.

Salesforce objects:
  - WorkOrder  (standard object)
  - ServiceAppointment (SA) — scheduling layer
  - ServiceResource — the technician
  - TimeSheet / TimeSheetEntry
  - Account — client/customer
"""


def work_order_to_sf(wo: dict) -> dict:
    """Local WorkOrder dict → Salesforce WorkOrder payload."""
    return {
        "Subject": wo.get("title"),
        "Description": wo.get("description"),
        "Status": _status_to_sf(wo.get("status")),
        "Priority": wo.get("priority", "medium").capitalize(),
        "WorkTypeId": None,  # populated when work types are configured in SF org
        "AccountId": wo.get("sf_client_id"),
        "Street": wo.get("site_address"),
        "City": wo.get("site_city"),
        "StartDate": wo.get("scheduled_start"),
        "EndDate": wo.get("scheduled_end"),
    }


def sf_to_work_order(sf: dict) -> dict:
    """Salesforce WorkOrder record → local WorkOrder dict."""
    return {
        "salesforce_id": sf.get("Id"),
        "title": sf.get("Subject"),
        "description": sf.get("Description"),
        "status": _sf_to_status(sf.get("Status")),
        "site_address": sf.get("Street"),
        "site_city": sf.get("City"),
        "scheduled_start": sf.get("StartDate"),
        "scheduled_end": sf.get("EndDate"),
    }


def timesheet_to_sf(ts: dict) -> dict:
    """Local TimeSheet → Salesforce TimeSheet payload."""
    return {
        "ServiceResourceId": ts.get("sf_technician_id"),
        "StartTime": ts.get("started_at"),
        "EndTime": ts.get("ended_at"),
        "Status": "New",
        "WorkOrderId": ts.get("sf_work_order_id"),
    }


def account_to_client(sf: dict) -> dict:
    """Salesforce Account → local Client dict."""
    return {
        "salesforce_id": sf.get("Id"),
        "name": sf.get("Name"),
        "company": sf.get("Name"),
        "email": sf.get("PersonEmail"),
        "phone": sf.get("Phone"),
        "address": sf.get("BillingStreet"),
        "city": sf.get("BillingCity"),
        "state": sf.get("BillingState"),
        "postcode": sf.get("BillingPostalCode"),
        "country": sf.get("BillingCountry") or "AU",
    }


_STATUS_MAP = {
    "draft": "Draft",
    "scheduled": "Scheduled",
    "dispatched": "Dispatched",
    "in_progress": "In Progress",
    "on_hold": "On Hold",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "invoiced": "Closed",
}

_SF_STATUS_MAP = {v: k for k, v in _STATUS_MAP.items()}


def _status_to_sf(status: str) -> str:
    return _STATUS_MAP.get(status, "Draft")


def _sf_to_status(sf_status: str) -> str:
    return _SF_STATUS_MAP.get(sf_status, "draft")
