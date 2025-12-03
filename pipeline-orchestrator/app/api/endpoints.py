from fastapi import APIRouter, UploadFile, File
from app.services.flow import run_pipeline


router = APIRouter()


@router.post("/")
async def process_audio(file: UploadFile = File(...)):
    return await run_pipeline(file)

