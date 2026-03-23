from fastapi import FastAPI

from backend.src.api.auth import router as auth_router
from backend.src.api.debug import router as debug_router
from backend.src.api.notes_create import router as notes_create_router
from backend.src.api.notes_detail import router as notes_detail_router
from backend.src.api.notes_list import router as notes_list_router
from backend.src.exceptions.errors import install_exception_handlers
from backend.src.logging.logger import configure_logging
from backend.src.services.database import bootstrap_database
from backend.src.settings.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()
    bootstrap_database()

    app = FastAPI(
        title=settings.app_name,
        description="Demo login, note list, note create, audio upload, note detail, and retry endpoints.",
        version="0.1.0",
    )
    install_exception_handlers(app)
    app.include_router(auth_router)
    app.include_router(debug_router)
    app.include_router(notes_create_router)
    app.include_router(notes_list_router)
    app.include_router(notes_detail_router)
    return app


app = create_app()
