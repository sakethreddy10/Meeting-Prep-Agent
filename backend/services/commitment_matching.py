"""Shared commitment/resolution text matching (research.md §6, corrected design).

A commitment's persisted fact text looks like:
    "[commitment] user committed: Send an architecture document. (deadline: next Friday)"
A resolution fact's text looks like:
    "Commitment resolution: the commitment described as 'Send an architecture
    document.' is now resolved. Evidence: ..."

Both embed the same core description (`item.text` / `matched_commitment_hint`) as a
substring, so matching on a short snippet of that core text is robust without
requiring exact equality.
"""

import re

_CORE_PATTERN = re.compile(r"committed:\s*(.+?)(?:\s*\(deadline:|$)")
_SNIPPET_LEN = 20


def commitment_snippet(commitment_fact_text: str) -> str:
    match = _CORE_PATTERN.search(commitment_fact_text)
    core = match.group(1).strip() if match else commitment_fact_text
    return core[:_SNIPPET_LEN]


def is_resolved(commitment_fact_text: str, resolution_texts: list[str]) -> bool:
    snippet = commitment_snippet(commitment_fact_text)
    if not snippet:
        return False
    return any(snippet in resolution_text for resolution_text in resolution_texts)
