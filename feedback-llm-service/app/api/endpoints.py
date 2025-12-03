from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any
from app.services.logic import run_service_logic


router = APIRouter()


class FeedbackRequest(BaseModel):
    transcript: str
    alignment: List[Dict[str, Any]]
    user_phonemes: Dict[str, List[str]]
    target_phonemes: Dict[str, List[str]]
    phoneme_diff: List[Dict[str, Any]]


@router.post("/")
async def generate_feedback(req: FeedbackRequest):
    return await run_service_logic(req)

