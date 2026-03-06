"""
TTS Service API Endpoints
Consistent with AgentForge Voice Microservices patterns
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import logging
import time

from app.services.logic import run_service_logic, AVAILABLE_VOICES, check_storage_connection
from app.schemas.request_response import (
    TTSRequest,
    TTSResponse,
    VoicesResponse,
    HealthResponse,
    ErrorResponse
)
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post(
    "/process",
    response_model=TTSResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    },
    summary="Synthesize Speech from Text",
    description="Convert text to speech audio using Google Gemini TTS. Returns a URL to the generated WAV file."
)
async def process_tts(req: TTSRequest) -> TTSResponse:
    """
    Generate speech audio from text.
    
    This endpoint converts the provided text to speech using Google's Gemini TTS API.
    The generated audio is uploaded to object storage and a URL is returned.
    
    **Process:**
    1. Receive text input
    2. Call Gemini TTS API with specified voice
    3. Convert PCM audio to WAV format
    4. Upload to MinIO/S3 storage
    5. Return audio URL
    
    **Note:** If MOCK_MODE is enabled or no API key is configured, a mock response is returned.
    """
    try:
        start_time = time.time()
        logger.info(f"Processing TTS request: text_length={len(req.text)}, voice={req.voice}")
        
        result = await run_service_logic(req)
        
        # Add processing time
        result["processing_time"] = round(time.time() - start_time, 3)
        
        return TTSResponse(**result)
        
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error(f"Runtime error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during TTS synthesis")
        raise HTTPException(status_code=500, detail=f"TTS synthesis failed: {str(e)}")


@router.get(
    "/voices",
    response_model=VoicesResponse,
    summary="List Available Voices",
    description="Get a list of all available TTS voices."
)
async def list_voices() -> VoicesResponse:
    """
    Get all available TTS voices.
    
    Returns a list of voice names that can be used in the process endpoint.
    All voices are US English speakers with different characteristics.
    """
    return VoicesResponse(
        voices=AVAILABLE_VOICES,
        default_voice=settings.GEMINI_TTS_VOICE,
        total=len(AVAILABLE_VOICES)
    )


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Check if the TTS service is healthy and properly configured"
)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    Returns service status, model info, and storage connection status.
    """
    storage_ok = check_storage_connection()
    
    # Service is ok if either mock mode is on or we have API key and storage
    if settings.MOCK_MODE:
        status = "ok"
    elif settings.GEMINI_API_KEY and storage_ok:
        status = "ok"
    else:
        status = "degraded"
    
    return HealthResponse(
        status=status,
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        model=settings.GEMINI_TTS_MODEL,
        default_voice=settings.GEMINI_TTS_VOICE,
        mock_mode=settings.MOCK_MODE,
        storage_connected=storage_ok
    )


@router.get(
    "/info",
    summary="Service Info",
    description="Get detailed information about the TTS service configuration"
)
async def service_info():
    """
    Get detailed service information including model configuration.
    """
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "model": settings.GEMINI_TTS_MODEL,
        "default_voice": settings.GEMINI_TTS_VOICE,
        "available_voices": len(AVAILABLE_VOICES),
        "supported_languages": settings.SUPPORTED_LANGUAGES,
        "sample_rate": settings.SAMPLE_RATE,
        "audio_format": settings.AUDIO_FORMAT,
        "mock_mode": settings.MOCK_MODE,
        "storage": {
            "endpoint": settings.STORAGE_ENDPOINT,
            "bucket": settings.STORAGE_BUCKET
        }
    }

