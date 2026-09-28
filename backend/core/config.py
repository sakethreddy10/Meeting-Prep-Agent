from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    hindsight_api_url: str = "http://localhost:8888"
    hindsight_api_key: str = ""

    llm_provider: Literal["groq", "foundry"] = "groq"
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    foundry_endpoint: str = ""
    foundry_api_key: str = ""
    foundry_model: str = ""

    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""

    sarvam_api_key: str = ""

    database_path: str = "./data/app.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()
