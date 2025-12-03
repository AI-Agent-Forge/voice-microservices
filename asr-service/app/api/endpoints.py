from fastapi import APIRouter, UploadFile, File
from app.services.logic import run_service_logic
from app.schemas.request_response import ASRResponse


router = APIRouter()


@router.post("/", response_model=ASRResponse)
async def process_audio(file: UploadFile = File(...)):
    result = await run_service_logic(file)
    return result

