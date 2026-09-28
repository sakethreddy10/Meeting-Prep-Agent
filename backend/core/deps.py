"""FastAPI dependency providers for shared singletons."""

from functools import lru_cache

from core.config import get_settings
from integrations.hindsight.client import HindsightAdapter
from integrations.llm.provider import LLMProvider, get_llm_provider


@lru_cache
def get_hindsight_adapter() -> HindsightAdapter:
    settings = get_settings()
    return HindsightAdapter(base_url=settings.hindsight_api_url, api_key=settings.hindsight_api_key)


@lru_cache
def get_llm() -> LLMProvider:
    return get_llm_provider(get_settings())
