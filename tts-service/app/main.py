"""
TTS Service - Text-to-Speech using Google Gemini TTS API
Consistent with AgentForge Voice Microservices architecture
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.api.endpoints import router
from app.core.config import settings
import logging

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    description="""
    Text-to-Speech service using Google Gemini TTS API.
    
    ## Features
    - Generate US English speech audio from text
    - Multiple voice options (30 available voices)
    - WAV format output at 24kHz
    - Audio storage in MinIO/S3
    
    ## Endpoints
    - `POST /tts/process` - Synthesize speech from text
    - `GET /tts/voices` - List available voices
    - `GET /tts/health` - Health check
    - `GET /health` - Root health check
    """,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """Root health check endpoint."""
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "model": settings.GEMINI_TTS_MODEL,
        "default_voice": settings.GEMINI_TTS_VOICE,
        "mock_mode": settings.MOCK_MODE
    }


@app.get("/", include_in_schema=False)
async def root():
    """Redirect to API documentation."""
    return RedirectResponse(url="/docs")


# Include TTS routes
app.include_router(router, prefix="/tts", tags=["Text-to-Speech"])


@app.on_event("startup")
async def startup_event():
    """Log startup information."""
    logger.info(f"Starting {settings.SERVICE_NAME} v{settings.SERVICE_VERSION}")
    logger.info(f"TTS Model: {settings.GEMINI_TTS_MODEL}")
    logger.info(f"Default Voice: {settings.GEMINI_TTS_VOICE}")
    logger.info(f"Mock Mode: {settings.MOCK_MODE}")
    logger.info(f"Storage: {settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET}")

