"""LLM provider abstraction (research.md §1).

Business logic (agents/*) depends only on the `LLMProvider` protocol below, never on
a concrete vendor SDK. Selection is via `Settings.llm_provider` ("groq" | "foundry").
"""

import json
from typing import Any, Protocol

from core.config import Settings


class LLMProvider(Protocol):
    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, Any],
    ) -> dict[str, Any]:
        """Return a dict validated against `response_schema` (JSON-schema shape)."""
        ...


class GroqProvider:
    """Primary provider: Groq's OpenAI-compatible structured-output API."""

    def __init__(self, api_key: str, model: str):
        self._api_key = api_key
        self._model = model

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, Any],
    ) -> dict[str, Any]:
        from groq import Groq

        client = Groq(api_key=self._api_key)
        completion = client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "response", "schema": response_schema},
            },
            temperature=0.1,
        )
        content = completion.choices[0].message.content
        return json.loads(content)


class FoundryProvider:
    """Secondary provider: Microsoft Foundry-hosted models, same protocol shape."""

    def __init__(self, endpoint: str, api_key: str, model: str):
        self._endpoint = endpoint
        self._api_key = api_key
        self._model = model

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        response_schema: dict[str, Any],
    ) -> dict[str, Any]:
        import httpx

        response = httpx.post(
            f"{self._endpoint}/chat/completions",
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={
                "model": self._model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {"name": "response", "schema": response_schema},
                },
                "temperature": 0.1,
            },
            timeout=60.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)


def get_llm_provider(settings: Settings) -> LLMProvider:
    if settings.llm_provider == "foundry":
        return FoundryProvider(
            endpoint=settings.foundry_endpoint,
            api_key=settings.foundry_api_key,
            model=settings.foundry_model,
        )
    return GroqProvider(api_key=settings.groq_api_key, model=settings.groq_model)
