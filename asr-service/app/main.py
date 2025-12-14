"""
ASR Service - Automatic Speech Recognition with WhisperX
FastAPI application for audio transcription with word-level timestamps
"""

# ============================================================
# CRITICAL: PyTorch 2.6+ Compatibility Patch
# Must be applied BEFORE any other imports that use torch.load
# This fixes the weights_only=True default that breaks pyannote/WhisperX
# ============================================================
import torch
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load

# Also add safe globals for omegaconf (used by pyannote)
try:
    from omegaconf import DictConfig, ListConfig
    from omegaconf.base import ContainerMetadata
    torch.serialization.add_safe_globals([DictConfig, ListConfig, ContainerMetadata])
except ImportError:
    pass
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.endpoints import router
from app.core.config import settings, log_config
from app.services.logic import get_model, is_model_loaded

# Configure standard logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Preloads the WhisperX model on startup.
    """
    # Startup
    logger.info("Starting ASR Service...")
    log_config()
    
    # Preload model (non-blocking in mock mode)
    if not settings.MOCK_MODE:
        try:
            logger.info("Preloading WhisperX model...")
            get_model()
            logger.info("WhisperX model preloaded successfully")
        except Exception as e:
            logger.error(f"Failed to preload model: {str(e)}")
            # Don't fail startup - service can still work in degraded mode
    else:
        logger.info("Running in MOCK_MODE - model not loaded")
    
    yield
    
    # Shutdown
    logger.info("Shutting down ASR Service...")


# Create FastAPI application
app = FastAPI(
    title="ASR Service",
    description="""
    Automatic Speech Recognition service using WhisperX.
    
    ## Features
    - Audio transcription with word-level timestamps
    - Support for file upload and URL-based processing
    - GPU acceleration (CUDA) with CPU fallback
    - Multiple model sizes (tiny, base, small, medium, large-v2, large-v3)
    
    ## Supported Audio Formats
    wav, mp3, m4a, webm, ogg, flac
    """,
    version=settings.SERVICE_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # Allow all in development - restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health():
    """Basic health check endpoint"""
    return {
        "status": "ok" if is_model_loaded() else "degraded",
        "service": settings.SERVICE_NAME,
        "model_loaded": is_model_loaded()
    }


@app.get("/", tags=["Root"])
def root():
    """Root endpoint with service info"""
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }


# Include the main processing router
app.include_router(router, prefix="/asr", tags=["ASR Processing"])


