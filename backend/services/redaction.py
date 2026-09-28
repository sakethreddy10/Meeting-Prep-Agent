"""Secret/credential redaction (FR-023: "MUST NOT store secrets, credentials, or API
keys as part of retained meeting memory").

Applied to Meeting Analyzer output before it is handed to
`memory_pipeline.retain(...)` (backend/services/memory_pipeline.py), since meeting
notes can legitimately contain a pasted API key, token, or password even though
that was never the point of the meeting.
"""

import re

_PATTERNS = [
    re.compile(r"\b(api[_-]?key|apikey)\s*[:=]\s*\S+", re.IGNORECASE),
    re.compile(r"\b(secret|token|password|passwd)\s*[:=]\s*\S+", re.IGNORECASE),
    re.compile(r"\bBearer\s+[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE),
    re.compile(r"\bsk-[A-Za-z0-9]{16,}\b"),  # common LLM/API secret-key shape
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),  # AWS access key id shape
]

REDACTED_PLACEHOLDER = "[REDACTED]"


def redact_text(text: str) -> str:
    """Replace anything matching a secret-like pattern with a placeholder."""
    redacted = text
    for pattern in _PATTERNS:
        redacted = pattern.sub(REDACTED_PLACEHOLDER, redacted)
    return redacted
