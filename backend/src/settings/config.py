from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]
load_dotenv(ROOT_DIR / ".env")


class Settings(BaseSettings):
    app_name: str = "Voice Notes Summary API"
    env: str = "development"
    demo_user_email: str = "demo@example.com"
    demo_user_name: str = "Demo User"
    demo_auth_secret: str = Field(default="local-demo-secret", min_length=8)
    database_path: str = str(ROOT_DIR / "backend" / "voice_notes.db")
    audio_storage_dir: str = str(ROOT_DIR / "backend" / "storage")
    processing_poll_interval_ms: int = 250
    processing_delay_ms: int = 0

    model_config = SettingsConfigDict(env_file=".env", env_prefix="VOICE_NOTES_")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    Path(settings.audio_storage_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.database_path).parent.mkdir(parents=True, exist_ok=True)
    return settings
