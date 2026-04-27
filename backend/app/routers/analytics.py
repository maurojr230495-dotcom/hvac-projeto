from datetime import datetime, timedelta, date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.dependencies import require_manager
from app.models.work_order import WorkOrder, WorkOrderStatus, WorkOrderPriority
from app.models.timesheet import TimeSheet, TimesheetStatus
from app.models.invoice import Invoice, InvoiceStatus
from app.models.maintenance_schedule import MaintenanceSchedule
from app.models.user import User, UserRole

router = APIRouter(prefix="/analytics", tags=["Analytics"])

SLA_HOURS = {
    WorkOrderPriority.CRITICAL.value: 2,
    WorkOrderPriority.HIGH.value:     4,
    WorkOrderPriority.MEDIUM.value:   24,
    WorkOrderPriority.LOW.value:      48,
}


@router.get("/dashboard")
def dashboard_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    today = datetime.utcnow().date()
    week_start = datetime.utcnow() - timedelta(days=7)

    # Work order counts by status
    status_counts = (
        db.query(WorkOrder.status, func.count(WorkOrder.id))
        .group_by(WorkOrder.status)
        .all()
    )
    by_status = {s: c for s, c in status_counts}

    # Weekly new orders per day (last 7 days)
    weekly = []
    for i in range(6, -1, -1):
        day = datetime.utcnow() - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end   = day.replace(hour=23, minute=59, second=59)
        created = db.query(func.count(WorkOrder.id)).filter(
            WorkOrder.created_at >= day_start,
            WorkOrder.created_at <= day_end,
        ).scalar()
        completed = db.query(func.count(WorkOrder.id)).filter(
            WorkOrder.status.in_(["completed", "invoiced"]),
            WorkOrder.updated_at >= day_start,
            WorkOrder.updated_at <= day_end,
        ).scalar()
        weekly.append({
            "day": day.strftime("%a"),
            "date": day.strftime("%d/%m"),
            "created": created,
            "completed": completed,
        })

    # Revenue this month
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    revenue_month = db.query(func.sum(Invoice.total)).filter(
        Invoice.status.in_(["sent", "paid"]),
        Invoice.created_at >= month_start,
    ).scalar() or 0

    # Revenue last month
    last_month_end = month_start - timedelta(seconds=1)
    last_month_start = last_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    revenue_last = db.query(func.sum(Invoice.total)).filter(
        Invoice.status.in_(["sent", "paid"]),
        Invoice.created_at >= last_month_start,
        Invoice.created_at <= last_month_end,
    ).scalar() or 0

    # SLA compliance (orders completed without breaching)
    total_completed = db.query(func.count(WorkOrder.id)).filter(
        WorkOrder.status.in_(["completed", "invoiced"])
    ).scalar() or 0
    sla_breached = db.query(func.count(WorkOrder.id)).filter(
        WorkOrder.sla_breached == True
    ).scalar() or 0
    sla_rate = round((1 - sla_breached / total_completed) * 100) if total_completed else 100

    # Active technicians on-site right now
    active_tech_ids = (
        db.query(TimeSheet.technician_id)
        .filter(TimeSheet.status == TimesheetStatus.ACTIVE.value)
        .distinct()
        .count()
    )

    # Upcoming PM in next 30 days
    upcoming_pm = db.query(func.count(MaintenanceSchedule.id)).filter(
        MaintenanceSchedule.is_active == True,
        MaintenanceSchedule.next_due_date <= date.today() + timedelta(days=30),
    ).scalar() or 0

    # Critical/high unassigned orders
    urgent_unassigned = db.query(func.count(WorkOrder.id)).filter(
        WorkOrder.priority.in_(["critical", "high"]),
        WorkOrder.technician_id == None,
        WorkOrder.status.notin_(["completed", "cancelled", "invoiced"]),
    ).scalar() or 0

    return {
        "by_status": by_status,
        "weekly": weekly,
        "revenue_month": round(revenue_month, 2),
        "revenue_last_month": round(revenue_last, 2),
        "sla_compliance_pct": sla_rate,
        "active_technicians": active_tech_ids,
        "upcoming_pm_30d": upcoming_pm,
        "urgent_unassigned": urgent_unassigned,
        "total_open": sum(
            v for k, v in by_status.items()
            if k not in ("completed", "cancelled", "invoiced")
        ),
    }


@router.get("/technician-utilisation")
def technician_utilisation(
    days: int = 7,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    since = datetime.utcnow() - timedelta(days=days)
    techs = db.query(User).filter(
        User.role == UserRole.TECHNICIAN.value,
        User.is_active == True,
    ).all()

    results = []
    for tech in techs:
        hours = db.query(func.sum(TimeSheet.total_hours)).filter(
            TimeSheet.technician_id == tech.id,
            TimeSheet.started_at >= since,
            TimeSheet.status.in_(["completed", "approved"]),
        ).scalar() or 0

        wo_count = db.query(func.count(WorkOrder.id)).filter(
            WorkOrder.technician_id == tech.id,
            WorkOrder.status.in_(["completed", "invoiced"]),
            WorkOrder.updated_at >= since,
        ).scalar() or 0

        results.append({
            "id": tech.id,
            "name": tech.name,
            "hours_logged": round(hours, 1),
            "jobs_completed": wo_count,
            "territory": tech.territory,
        })

    return sorted(results, key=lambda x: x["hours_logged"], reverse=True)
