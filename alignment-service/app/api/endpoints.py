from fastapi import APIRouter
from pydantic import BaseModel
from app.services.logic import run_service_logic


router = APIRouter()


class AlignmentRequest(BaseModel):
    audio_url: str
    transcript: str


@router.post("/")
async def process_alignment(req: AlignmentRequest):
    return await run_service_logic(req)

