"""assets, service reports, maintenance, invoices + work_order SLA fields

Revision ID: 0002_assets
Revises: 0001_initial
Create Date: 2024-01-02 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "0002_assets"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── assets ──────────────────────────────────────────────────────────────
    op.create_table(
        "assets",
        sa.Column("id",               sa.Integer(), primary_key=True),
        sa.Column("client_id",        sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("name",             sa.String(), nullable=False),
        sa.Column("asset_type",       sa.String(), nullable=False),
        sa.Column("brand",            sa.String(), nullable=True),
        sa.Column("model",            sa.String(), nullable=True),
        sa.Column("serial_number",    sa.String(), nullable=True),
        sa.Column("capacity_kw",      sa.String(), nullable=True),
        sa.Column("refrigerant",      sa.String(), nullable=True),
        sa.Column("location",         sa.String(), nullable=True),
        sa.Column("installation_date", sa.Date(), nullable=True),
        sa.Column("warranty_expiry",  sa.Date(), nullable=True),
        sa.Column("last_service_date", sa.Date(), nullable=True),
        sa.Column("next_service_due", sa.Date(), nullable=True),
        sa.Column("notes",            sa.Text(), nullable=True),
        sa.Column("is_active",        sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("salesforce_id",    sa.String(), nullable=True),
        sa.Column("created_at",       sa.DateTime(), nullable=True),
        sa.Column("updated_at",       sa.DateTime(), nullable=True),
    )
    op.create_index("ix_assets_id", "assets", ["id"])
    op.create_index("ix_assets_serial", "assets", ["serial_number"])

    # ── work_orders — add asset_id + SLA fields ──────────────────────────────
    op.add_column("work_orders", sa.Column("asset_id",     sa.Integer(), sa.ForeignKey("assets.id"), nullable=True))
    op.add_column("work_orders", sa.Column("sla_due_at",   sa.DateTime(), nullable=True))
    op.add_column("work_orders", sa.Column("sla_breached", sa.Boolean(), nullable=False, server_default="false"))

    # ── service_reports ──────────────────────────────────────────────────────
    op.create_table(
        "service_reports",
        sa.Column("id",               sa.Integer(), primary_key=True),
        sa.Column("work_order_id",    sa.Integer(), sa.ForeignKey("work_orders.id"), nullable=False, unique=True),
        sa.Column("technician_id",    sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("work_performed",   sa.Text(), nullable=True),
        sa.Column("recommendations",  sa.Text(), nullable=True),
        sa.Column("parts_used",       sa.JSON(), nullable=True),
        sa.Column("checklist_results", sa.JSON(), nullable=True),
        sa.Column("readings",         sa.JSON(), nullable=True),
        sa.Column("tech_signature",   sa.Text(), nullable=True),
        sa.Column("client_signature", sa.Text(), nullable=True),
        sa.Column("client_signed_by", sa.String(), nullable=True),
        sa.Column("client_signed_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at",     sa.DateTime(), nullable=True),
        sa.Column("created_at",       sa.DateTime(), nullable=True),
        sa.Column("updated_at",       sa.DateTime(), nullable=True),
    )
    op.create_index("ix_service_reports_id", "service_reports", ["id"])

    # ── maintenance_schedules ─────────────────────────────────────────────────
    op.create_table(
        "maintenance_schedules",
        sa.Column("id",                       sa.Integer(), primary_key=True),
        sa.Column("asset_id",                 sa.Integer(), sa.ForeignKey("assets.id"), nullable=True),
        sa.Column("client_id",                sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("preferred_technician_id",  sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("title",                    sa.String(), nullable=False),
        sa.Column("description",              sa.Text(), nullable=True),
        sa.Column("service_type",             sa.String(), nullable=True),
        sa.Column("frequency",                sa.String(), nullable=False),
        sa.Column("estimated_hours",          sa.Float(), nullable=True),
        sa.Column("hourly_rate",              sa.Float(), nullable=True),
        sa.Column("is_active",                sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("start_date",               sa.Date(), nullable=True),
        sa.Column("next_due_date",            sa.Date(), nullable=True),
        sa.Column("last_generated_at",        sa.DateTime(), nullable=True),
        sa.Column("created_at",               sa.DateTime(), nullable=True),
        sa.Column("updated_at",               sa.DateTime(), nullable=True),
    )
    op.create_index("ix_maintenance_schedules_id", "maintenance_schedules", ["id"])

    # ── invoices ─────────────────────────────────────────────────────────────
    op.create_table(
        "invoices",
        sa.Column("id",              sa.Integer(), primary_key=True),
        sa.Column("invoice_number",  sa.String(), nullable=True, unique=True),
        sa.Column("work_order_id",   sa.Integer(), sa.ForeignKey("work_orders.id"), nullable=False),
        sa.Column("client_id",       sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("created_by_id",   sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("line_items",      sa.Text(), nullable=True),
        sa.Column("labour_hours",    sa.Float(), nullable=True, server_default="0"),
        sa.Column("hourly_rate",     sa.Float(), nullable=True, server_default="0"),
        sa.Column("labour_cost",     sa.Float(), nullable=True, server_default="0"),
        sa.Column("materials_cost",  sa.Float(), nullable=True, server_default="0"),
        sa.Column("subtotal",        sa.Float(), nullable=True, server_default="0"),
        sa.Column("gst_rate",        sa.Float(), nullable=True, server_default="0.10"),
        sa.Column("gst_amount",      sa.Float(), nullable=True, server_default="0"),
        sa.Column("total",           sa.Float(), nullable=True, server_default="0"),
        sa.Column("status",          sa.String(), nullable=False, server_default="draft"),
        sa.Column("due_date",        sa.Date(), nullable=True),
        sa.Column("paid_at",         sa.DateTime(), nullable=True),
        sa.Column("notes",           sa.Text(), nullable=True),
        sa.Column("created_at",      sa.DateTime(), nullable=True),
        sa.Column("updated_at",      sa.DateTime(), nullable=True),
    )
    op.create_index("ix_invoices_id", "invoices", ["id"])
    op.create_index("ix_invoices_number", "invoices", ["invoice_number"])


def downgrade() -> None:
    op.drop_table("invoices")
    op.drop_table("maintenance_schedules")
    op.drop_table("service_reports")
    op.drop_column("work_orders", "sla_breached")
    op.drop_column("work_orders", "sla_due_at")
    op.drop_column("work_orders", "asset_id")
    op.drop_table("assets")
