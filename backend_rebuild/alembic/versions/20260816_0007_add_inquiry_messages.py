"""Add inquiry conversation messaging.

Revision ID: 20260816_0007
Revises: 20260802_0006
Create Date: 2026-08-16
"""

from collections.abc import Sequence
from uuid import uuid4

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260816_0007"
down_revision: str | Sequence[str] | None = "20260802_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # Conversation metadata on inquiries
    # ---------------------------------------------------------

    op.add_column(
        "inquiries",
        sa.Column(
            "last_message_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "inquiries",
        sa.Column(
            "last_message_preview",
            sa.String(length=240),
            nullable=True,
        ),
    )

    op.add_column(
        "inquiries",
        sa.Column(
            "last_message_sender_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )

    op.add_column(
        "inquiries",
        sa.Column(
            "sender_last_read_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.add_column(
        "inquiries",
        sa.Column(
            "recipient_last_read_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_inquiries_last_message_sender_id_users",
        "inquiries",
        "users",
        ["last_message_sender_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # Existing inquiry message becomes the initial message
    # metadata for each conversation.
    op.execute(
        sa.text(
            """
            UPDATE inquiries
            SET
                last_message_at = created_at,
                last_message_preview = LEFT(message, 240),
                last_message_sender_id = sender_id,
                sender_last_read_at = created_at
            """
        )
    )

    op.alter_column(
        "inquiries",
        "last_message_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.text("now()"),
    )

    op.alter_column(
        "inquiries",
        "last_message_preview",
        existing_type=sa.String(length=240),
        nullable=False,
    )

    op.alter_column(
        "inquiries",
        "last_message_sender_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )

    op.create_index(
        "ix_inquiries_sender_last_message",
        "inquiries",
        ["sender_id", "last_message_at"],
    )

    op.create_index(
        "ix_inquiries_recipient_last_message",
        "inquiries",
        ["recipient_id", "last_message_at"],
    )

    # ---------------------------------------------------------
    # Message table
    # ---------------------------------------------------------

    op.create_table(
        "inquiry_messages",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "inquiry_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "sender_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "message",
            sa.Text(),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(
            ["inquiry_id"],
            ["inquiries.id"],
            name="fk_inquiry_messages_inquiry_id_inquiries",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["sender_id"],
            ["users.id"],
            name="fk_inquiry_messages_sender_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "id",
            name="pk_inquiry_messages",
        ),
    )

    op.create_index(
        "ix_inquiry_messages_inquiry_created",
        "inquiry_messages",
        ["inquiry_id", "created_at"],
    )

    # ---------------------------------------------------------
    # Backfill existing inquiries into first messages.
    #
    # Batched inserts avoid doing one INSERT round-trip per
    # existing inquiry.
    # ---------------------------------------------------------

    connection = op.get_bind()

    result = connection.execute(
        sa.text(
            """
            SELECT
                id,
                sender_id,
                message,
                created_at
            FROM inquiries
            ORDER BY created_at
            """
        )
    )

    inquiry_messages = sa.table(
        "inquiry_messages",
        sa.column(
            "id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column(
            "inquiry_id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column(
            "sender_id",
            postgresql.UUID(as_uuid=True),
        ),
        sa.column(
            "message",
            sa.Text(),
        ),
        sa.column(
            "created_at",
            sa.DateTime(timezone=True),
        ),
        sa.column(
            "updated_at",
            sa.DateTime(timezone=True),
        ),
    )

    batch: list[dict[str, object]] = []

    for row in result.mappings():
        batch.append(
            {
                "id": uuid4(),
                "inquiry_id": row["id"],
                "sender_id": row["sender_id"],
                "message": row["message"],
                "created_at": row["created_at"],
                "updated_at": row["created_at"],
            }
        )

        if len(batch) >= 1000:
            connection.execute(
                inquiry_messages.insert(),
                batch,
            )
            batch.clear()

    if batch:
        connection.execute(
            inquiry_messages.insert(),
            batch,
        )


def downgrade() -> None:
    op.drop_index(
        "ix_inquiry_messages_inquiry_created",
        table_name="inquiry_messages",
    )

    op.drop_table(
        "inquiry_messages",
    )

    op.drop_index(
        "ix_inquiries_recipient_last_message",
        table_name="inquiries",
    )

    op.drop_index(
        "ix_inquiries_sender_last_message",
        table_name="inquiries",
    )

    op.drop_constraint(
        "fk_inquiries_last_message_sender_id_users",
        "inquiries",
        type_="foreignkey",
    )

    op.drop_column(
        "inquiries",
        "recipient_last_read_at",
    )

    op.drop_column(
        "inquiries",
        "sender_last_read_at",
    )

    op.drop_column(
        "inquiries",
        "last_message_sender_id",
    )

    op.drop_column(
        "inquiries",
        "last_message_preview",
    )

    op.drop_column(
        "inquiries",
        "last_message_at",
    )