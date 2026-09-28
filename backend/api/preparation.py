from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from agents.preparation_agent import build_answer_agent, build_preparation_agent
from core.deps import get_hindsight_adapter, get_llm
from core.errors import UpstreamServiceError
from integrations.hindsight.client import HindsightAdapter
from integrations.llm.provider import LLMProvider
from models import db
from models.preparation import Answer, Mode, PreparationBrief
from services import memory_pipeline

router = APIRouter(tags=["preparation"])


class PrepareRequest(BaseModel):
    mode: Mode
    question: str | None = None


@router.post("/meetings/{meeting_id}/prepare", response_model=None)
def prepare_meeting(
    meeting_id: str,
    body: PrepareRequest,
    llm: LLMProvider = Depends(get_llm),
    hindsight: HindsightAdapter = Depends(get_hindsight_adapter),
) -> PreparationBrief | Answer:
    meeting = db.get_meeting(meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    try:
        if body.question:
            return memory_pipeline.answer(
                hindsight,
                build_answer_agent(llm),
                relationship_id=meeting["relationship_id"],
                mode=body.mode,
                question=body.question,
            )

        return memory_pipeline.prepare(
            hindsight,
            build_preparation_agent(llm),
            relationship_id=meeting["relationship_id"],
            meeting_title=meeting["title"],
            mode=body.mode,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise UpstreamServiceError(
            "hindsight_unavailable" if body.mode == Mode.MEMORY_ENABLED else "llm_unavailable",
            "Could not generate a preparation response for this meeting.",
        ) from exc
