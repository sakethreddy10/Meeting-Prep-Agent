"""Thin structured-output agent wrapper over `LLMProvider` (research.md §2).

Two agents are built from this: the Meeting Analyzer and the Preparation Agent.
Each owns its own system prompt and response schema; this base class only handles
the call-and-validate mechanics so that swap-in of a different LLM provider never
touches agent-specific logic.
"""

from typing import Any

from integrations.llm.provider import LLMProvider


class StructuredAgent:
    def __init__(self, llm: LLMProvider, system_prompt: str, response_schema: dict[str, Any]):
        self._llm = llm
        self._system_prompt = system_prompt
        self._response_schema = response_schema

    def run(self, user_prompt: str) -> dict[str, Any]:
        return self._llm.generate_structured(
            system_prompt=self._system_prompt,
            user_prompt=user_prompt,
            response_schema=self._response_schema,
        )
