from datetime import datetime

from pydantic import BaseModel


class Relationship(BaseModel):
    id: str
    name: str
    slug: str
    organization: str | None = None
    bank_id: str
    created_at: datetime
    meeting_count: int = 0


class RelationshipCreate(BaseModel):
    name: str
    organization: str | None = None
