from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api import meetings, memory, preparation, transcripts
from core.errors import InvalidMeetingInputError, UpstreamServiceError
from models.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Meeting Continuity Agent", lifespan=lifespan)


@app.exception_handler(UpstreamServiceError)
async def upstream_error_handler(request: Request, exc: UpstreamServiceError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"error": exc.error_code, "message": exc.message})


@app.exception_handler(InvalidMeetingInputError)
async def invalid_input_handler(
    request: Request, exc: InvalidMeetingInputError
) -> JSONResponse:
    return JSONResponse(
        status_code=422, content={"error": "invalid_meeting_input", "message": exc.message}
    )


app.include_router(meetings.router, prefix="/api")
app.include_router(transcripts.router, prefix="/api")
app.include_router(memory.router, prefix="/api")
app.include_router(preparation.router, prefix="/api")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
