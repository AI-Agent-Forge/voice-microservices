from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.logic import run_service_logic


router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = None  # Optional voice name override


@router.post("/")
async def speak(req: TTSRequest):
    return await run_service_logic(req)

