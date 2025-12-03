from fastapi import APIRouter
from pydantic import BaseModel
from app.services.logic import run_service_logic


router = APIRouter()


class VCRequest(BaseModel):
    tts_audio_url: str
    user_voice_sample_url: str


@router.post("/")
async def convert(req: VCRequest):
    return await run_service_logic(req)

