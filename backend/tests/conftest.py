import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.src.main import create_app
from backend.src.services.database import bootstrap_database
from backend.src.settings.config import get_settings


@pytest.fixture(autouse=True)
def isolated_environment(tmp_path: Path):
    os.environ["VOICE_NOTES_DATABASE_PATH"] = str(tmp_path / "voice-notes.db")
    os.environ["VOICE_NOTES_AUDIO_STORAGE_DIR"] = str(tmp_path / "storage")
    get_settings.cache_clear()
    bootstrap_database()
    yield
    get_settings.cache_clear()


@pytest.fixture()
def client() -> TestClient:
    return TestClient(create_app())
