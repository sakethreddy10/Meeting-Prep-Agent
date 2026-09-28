import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import pytest
from fastapi.testclient import TestClient

from core.config import get_settings
from core.deps import get_hindsight_adapter, get_llm
from models import db


class FakeHindsightAdapter:
    """In-memory stand-in for HindsightAdapter, used across contract/integration tests
    so no live Hindsight server is required (contracts/api-contracts.md tests are
    explicitly "mocked")."""

    def __init__(self):
        self.banks: dict[str, dict] = {}

    def ensure_bank(self, bank_id: str) -> None:
        self.banks.setdefault(bank_id, {"facts": []})

    def retain_meeting(self, bank_id, meeting_id, relationship_name, title, occurred_at, content, entities=None):
        self.banks.setdefault(bank_id, {"facts": []})
        for line in content.split("\n"):
            if not line.strip():
                continue
            category = line.split("]", 1)[0].lstrip("[")
            self.banks[bank_id]["facts"].append(
                {
                    "id": f"fact-{len(self.banks[bank_id]['facts'])}",
                    "text": line,
                    "tags": [f"relationship:{bank_id}", f"meeting:{meeting_id}", f"memory_type:{category}"],
                    "occurred_start": occurred_at.isoformat(),
                    "mentioned_at": occurred_at.isoformat(),
                }
            )
        return {"success": True}

    def retain_commitment_resolution(self, bank_id, meeting_id, relationship_name, occurred_at, resolution_text):
        self.banks.setdefault(bank_id, {"facts": []})
        self.banks[bank_id]["facts"].append(
            {
                "id": f"fact-{len(self.banks[bank_id]['facts'])}",
                "text": resolution_text,
                "tags": [f"relationship:{bank_id}", f"meeting:{meeting_id}", "memory_type:commitment_resolution"],
                "occurred_start": occurred_at.isoformat(),
                "mentioned_at": occurred_at.isoformat(),
            }
        )
        return {"success": True}

    def recall_bounded(self, bank_id, query, max_tokens=3000, budget="mid"):
        return list(self.banks.get(bank_id, {"facts": []})["facts"])

    def recall_unresolved(self, bank_id, max_tokens=1000):
        facts = self.banks.get(bank_id, {"facts": []})["facts"]
        return [f for f in facts if "memory_type:commitment" in f["tags"] or "memory_type:unresolved_question" in f["tags"]]

    def recall_commitment_resolutions(self, bank_id, max_tokens=2000):
        facts = self.banks.get(bank_id, {"facts": []})["facts"]
        return [f for f in facts if "memory_type:commitment_resolution" in f["tags"]]

    def recall_for_preparation(self, bank_id, query):
        return {
            "relevance_ranked": self.recall_bounded(bank_id, query),
            "always_included_unresolved": self.recall_unresolved(bank_id),
            "commitment_resolutions": self.recall_commitment_resolutions(bank_id),
        }


class FakeLLMProvider:
    """Deterministic stand-in for LLMProvider. Tests configure `.next_response` (or
    `.responses` queue) instead of calling a real model."""

    def __init__(self):
        self.responses: list[dict] = []
        self.calls: list[tuple[str, str]] = []

    def generate_structured(self, system_prompt, user_prompt, response_schema):
        self.calls.append((system_prompt, user_prompt))
        if not self.responses:
            raise RuntimeError("FakeLLMProvider has no queued response for this call")
        return self.responses.pop(0)


@pytest.fixture
def fake_hindsight():
    return FakeHindsightAdapter()


@pytest.fixture
def fake_llm():
    return FakeLLMProvider()


@pytest.fixture
def client(tmp_path, monkeypatch, fake_hindsight, fake_llm):
    monkeypatch.setenv("DATABASE_PATH", str(tmp_path / "test.db"))
    get_settings.cache_clear()

    from main import app

    db.init_db()

    app.dependency_overrides[get_hindsight_adapter] = lambda: fake_hindsight
    app.dependency_overrides[get_llm] = lambda: fake_llm

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
