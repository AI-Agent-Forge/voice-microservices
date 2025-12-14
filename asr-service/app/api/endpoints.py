"""
ASR Service API Endpoints
Supports both file upload and audio URL processing
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
from typing import Optional
import structlog

from app.services.logic import run_service_logic, is_model_loaded, get_gpu_info
from app.schemas.request_response import (
    ASRRequest,
    ASRResponse,
    HealthResponse,
    ErrorResponse
)
from app.core.config import settings

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post(
    "/",
    response_model=ASRResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    },
    summary="Process Audio File",
    description="Transcribe an uploaded audio file with word-level timestamps"
)
async def process_audio_file(
    file: UploadFile = File(..., description="Audio file to transcribe"),
    language: Optional[str] = Form(None, description="Language code (e.g., 'en'). Auto-detect if not provided")
):
    """
    Process uploaded audio file and return transcription with word timestamps.
    
    Supported formats: wav, mp3, m4a, webm, ogg, flac
    """
    try:
        logger.info(
            "Processing audio file",
            filename=file.filename,
            content_type=file.content_type,
            language=language
        )
        
        # Validate file type
        if file.filename:
            ext = file.filename.split('.')[-1].lower()
            if ext not in settings.SUPPORTED_AUDIO_FORMATS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported audio format: {ext}. Supported: {settings.SUPPORTED_AUDIO_FORMATS}"
                )
        
        result = await run_service_logic(file=file, language=language)
        return ASRResponse(**result)
        
    except ValueError as e:
        logger.warning("Validation error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error("Runtime error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during transcription")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post(
    "/url",
    response_model=ASRResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Bad Request"},
        500: {"model": ErrorResponse, "description": "Internal Server Error"}
    },
    summary="Process Audio URL",
    description="Transcribe audio from a URL with word-level timestamps"
)
async def process_audio_url(request: ASRRequest):
    """
    Process audio file from URL and return transcription with word timestamps.
    
    The audio file will be downloaded and processed.
    Supported formats: wav, mp3, m4a, webm, ogg, flac
    """
    try:
        logger.info(
            "Processing audio from URL",
            url=str(request.audio_url),
            language=request.language
        )
        
        result = await run_service_logic(
            audio_url=str(request.audio_url),
            language=request.language
        )
        return ASRResponse(**result)
        
    except ValueError as e:
        logger.warning("Validation error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        logger.error("Runtime error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error during transcription")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health Check",
    description="Check if the ASR service is healthy and model is loaded"
)
async def health_check():
    """
    Health check endpoint.
    Returns service status, device info, and model status.
    """
    import torch
    
    gpu_info = get_gpu_info()
    
    return HealthResponse(
        status="ok" if is_model_loaded() else "degraded",
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        device=settings.DEVICE,
        model_loaded=is_model_loaded(),
        gpu_available=torch.cuda.is_available(),
        gpu_name=gpu_info.get("name")
    )


@router.get(
    "/info",
    summary="Service Info",
    description="Get detailed information about the ASR service configuration"
)
async def service_info():
    """
    Get detailed service information including model configuration.
    """
    import torch
    
    gpu_info = get_gpu_info()
    
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "model": {
            "name": settings.WHISPER_MODEL,
            "loaded": is_model_loaded(),
            "compute_type": settings.compute_type,
            "batch_size": settings.WHISPER_BATCH_SIZE
        },
        "device": {
            "type": settings.DEVICE,
            "cuda_available": torch.cuda.is_available(),
            "gpu_name": gpu_info.get("name"),
            "gpu_memory_total": gpu_info.get("memory_total"),
            "gpu_memory_allocated": gpu_info.get("memory_allocated")
        },
        "config": {
            "max_audio_duration": settings.MAX_AUDIO_DURATION_SECONDS,
            "supported_formats": settings.SUPPORTED_AUDIO_FORMATS,
            "default_language": settings.WHISPER_LANGUAGE,
            "mock_mode": settings.MOCK_MODE
        }
    }


