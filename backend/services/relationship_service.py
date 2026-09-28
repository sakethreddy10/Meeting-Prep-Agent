"""Relationship auto-creation and lookup (FR-001, FR-008; 2026-09-28 Clarifications).

A relationship's name/label is its unique identifier: the same name always resolves
to the same relationship, and a relationship is created automatically the first time
its name is used — no separate setup step (see spec.md Clarifications).
"""

import re
import uuid
from datetime import UTC, datetime

from integrations.hindsight.client import HindsightAdapter
from models.db import get_connection
from models.relationship import Relationship


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "relationship"


def _row_to_relationship(row) -> Relationship:
    return Relationship(
        id=row["id"],
        name=row["name"],
        slug=row["slug"],
        organization=row["organization"],
        bank_id=row["bank_id"],
        created_at=datetime.fromisoformat(row["created_at"]),
        meeting_count=row["meeting_count"],
    )


def get_by_name(name: str) -> Relationship | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM relationships WHERE lower(name) = lower(?)", (name,)
        ).fetchone()
    return _row_to_relationship(row) if row else None


def get_by_id(relationship_id: str) -> Relationship | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM relationships WHERE id = ?", (relationship_id,)
        ).fetchone()
    return _row_to_relationship(row) if row else None


def get_or_create(
    name: str,
    hindsight: HindsightAdapter,
    organization: str | None = None,
) -> Relationship:
    existing = get_by_name(name)
    if existing:
        return existing

    slug = slugify(name)
    bank_id = f"rel-{slug}"
    hindsight.ensure_bank(bank_id)

    relationship = Relationship(
        id=str(uuid.uuid4()),
        name=name,
        slug=slug,
        organization=organization,
        bank_id=bank_id,
        created_at=datetime.now(UTC),
        meeting_count=0,
    )
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO relationships (id, name, slug, organization, bank_id, created_at, "
            "meeting_count) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                relationship.id,
                relationship.name,
                relationship.slug,
                relationship.organization,
                relationship.bank_id,
                relationship.created_at.isoformat(),
                0,
            ),
        )
    return relationship


def increment_meeting_count(relationship_id: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "UPDATE relationships SET meeting_count = meeting_count + 1 WHERE id = ?",
            (relationship_id,),
        )
