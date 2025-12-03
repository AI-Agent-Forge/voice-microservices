from fastapi import APIRouter
from pydantic import BaseModel
from app.services.logic import run_service_logic


router = APIRouter()


class TTSRequest(BaseModel):
    text: str


@router.post("/")
async def speak(req: TTSRequest):
    return await run_service_logic(req)

