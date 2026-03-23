from fastapi import APIRouter
from backend.src.services.database import session

router = APIRouter(prefix="/debug", tags=["debug"])

@router.get("/db-dump")
def dump_database():
    tables = ["users", "voice_notes", "audio_assets", "processing_jobs"]
    data = {}
    
    with session() as connection:
        for table in tables:
            rows = connection.execute(f"SELECT * FROM {table}").fetchall()
            data[table] = [dict(row) for row in rows]
            
    return data
