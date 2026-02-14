from fastapi import APIRouter, UploadFile, File, Form
from app.services.flow import run_pipeline


router = APIRouter()


@router.post("/")
async def process_audio(
    file: UploadFile = File(...), 
    target_text: str = Form(None)
):
    return await run_pipeline(file, target_text)

