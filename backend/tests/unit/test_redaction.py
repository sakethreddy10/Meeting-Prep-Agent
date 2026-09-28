import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from services.redaction import redact_text  # noqa: E402


def test_redacts_api_key_pattern():
    text = "By the way here's my api_key: sk-abcdefghijklmnopqrstuvwx for testing"
    result = redact_text(text)
    assert "sk-abcdefghijklmnopqrstuvwx" not in result
    assert "[REDACTED]" in result


def test_redacts_bearer_token():
    text = "Use Bearer aBcD1234.efGh5678_ijKl to call the API"
    result = redact_text(text)
    assert "aBcD1234" not in result


def test_leaves_ordinary_text_untouched():
    text = "The client wants deployment before October and prefers concise proposals."
    assert redact_text(text) == text
