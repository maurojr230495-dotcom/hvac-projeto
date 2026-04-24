"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("hashed_password", sa.String(), nullable=True),
        sa.Column("microsoft_id", sa.String(), nullable=True),
        sa.Column("auth_provider", sa.String(), nullable=False, server_default="local"),
        sa.Column("role", sa.String(), nullable=False, server_default="technician"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("skills", sa.JSON(), nullable=True),
        sa.Column("territory", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_microsoft_id", "users", ["microsoft_id"], unique=True)

    # clients
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("company", sa.String(), nullable=True),
        sa.Column("email", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("postcode", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True, server_default="AU"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("salesforce_id", sa.String(), nullable=True),
        sa.Column("sync_status", sa.String(), nullable=True, server_default="unsynced"),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
        sa.Column("sync_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_clients_id", "clients", ["id"])
    op.create_index("ix_clients_salesforce_id", "clients", ["salesforce_id"])

    # work_orders
    op.create_table(
        "work_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_number", sa.String(), nullable=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("technician_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("service_type", sa.String(), nullable=True),
        sa.Column("priority", sa.String(), nullable=True, server_default="medium"),
        sa.Column("status", sa.String(), nullable=True, server_default="draft"),
        sa.Column("site_address", sa.String(), nullable=True),
        sa.Column("site_city", sa.String(), nullable=True),
        sa.Column("site_notes", sa.Text(), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(), nullable=True),
        sa.Column("scheduled_end", sa.DateTime(), nullable=True),
        sa.Column("actual_start", sa.DateTime(), nullable=True),
        sa.Column("actual_end", sa.DateTime(), nullable=True),
        sa.Column("cost_center", sa.String(), nullable=True),
        sa.Column("estimated_hours", sa.Float(), nullable=True),
        sa.Column("hourly_rate", sa.Float(), nullable=True),
        sa.Column("materials_cost", sa.Float(), nullable=True, server_default="0"),
        sa.Column("total_cost", sa.Float(), nullable=True),
        sa.Column("equipment", sa.JSON(), nullable=True),
        sa.Column("checklist", sa.JSON(), nullable=True),
        sa.Column("salesforce_id", sa.String(), nullable=True),
        sa.Column("sf_appointment_id", sa.String(), nullable=True),
        sa.Column("sync_status", sa.String(), nullable=True, server_default="unsynced"),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
        sa.Column("sync_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_work_orders_id", "work_orders", ["id"])
    op.create_index("ix_work_orders_order_number", "work_orders", ["order_number"], unique=True)
    op.create_index("ix_work_orders_salesforce_id", "work_orders", ["salesforce_id"])

    # timesheets
    op.create_table(
        "timesheets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("work_order_id", sa.Integer(), sa.ForeignKey("work_orders.id"), nullable=False),
        sa.Column("technician_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("cost_center", sa.String(), nullable=False),
        sa.Column("activity_type", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("ended_at", sa.DateTime(), nullable=True),
        sa.Column("paused_minutes", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("total_hours", sa.Float(), nullable=True),
        sa.Column("checkin_lat", sa.Float(), nullable=True),
        sa.Column("checkin_lng", sa.Float(), nullable=True),
        sa.Column("checkout_lat", sa.Float(), nullable=True),
        sa.Column("checkout_lng", sa.Float(), nullable=True),
        sa.Column("status", sa.String(), nullable=True, server_default="active"),
        sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("rejection_note", sa.Text(), nullable=True),
        sa.Column("salesforce_id", sa.String(), nullable=True),
        sa.Column("sync_status", sa.String(), nullable=True, server_default="unsynced"),
        sa.Column("last_synced_at", sa.DateTime(), nullable=True),
        sa.Column("sync_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_timesheets_id", "timesheets", ["id"])
    op.create_index("ix_timesheets_salesforce_id", "timesheets", ["salesforce_id"])

    # integration_logs
    op.create_table(
        "integration_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("direction", sa.String(), nullable=False),
        sa.Column("entity", sa.String(), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("external_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("response", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_integration_logs_id", "integration_logs", ["id"])
    op.create_index("ix_integration_logs_created_at", "integration_logs", ["created_at"])


def downgrade() -> None:
    op.drop_table("integration_logs")
    op.drop_table("timesheets")
    op.drop_table("work_orders")
    op.drop_table("clients")
    op.drop_table("users")
