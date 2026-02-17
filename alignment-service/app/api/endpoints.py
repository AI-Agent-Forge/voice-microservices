from fastapi import APIRouter, HTTPException
from app.services.logic import run_service_logic
from app.schemas.request_response import AlignmentRequest, AlignmentResponse
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post(
    "/process",
    response_model=AlignmentResponse,
    summary="Align Text to Audio",
    description="Perform forced alignment to get timestamps for transcript characters/phonemes."
)
async def process_alignment(req: AlignmentRequest):
    try:
        return await run_service_logic(req)
    except Exception as e:
        logger.error(f"Alignment failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

