"""
Feedback LLM Service - Structured LLM-based Pronunciation Feedback
FastAPI application for generating expert pronunciation coaching feedback
using OpenAI or Google Gemini API with structured JSON output.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager
import logging

from app.api.endpoints import router
from app.core.config import settings, log_config
from app.services.logic import init_service

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    Initializes PromptLoader and LLMClient on startup.
    """
    # Startup
    logger.info(f"Starting {settings.SERVICE_NAME} v{settings.SERVICE_VERSION}...")
    log_config()

    # Initialize service components
    try:
        init_service()
        logger.info("Service components initialized successfully")
    except Exception as e:
        logger.error(f"Service initialization error: {e}")
        # Don't fail startup — service can still return mock/fallback

    yield

    # Shutdown
    logger.info(f"Shutting down {settings.SERVICE_NAME}...")


app = FastAPI(
    title="Feedback LLM Service",
    description="""
    Converts structured phoneme analysis into human-readable pronunciation feedback using LLM.
    
    ## Features
    - Expert pronunciation analysis based on phoneme comparison data
    - Structured JSON feedback with actionable corrections
    - Overall, fluency, accuracy, and prosody scores (0-100)
    - Targeted practice drills (minimal pairs, repeat phrases, focus phonemes)
    - Word-level stress and rhythm analysis
    - Guardrails against hallucinated phoneme data
    - Dual LLM support: OpenAI (GPT-4o) and Google Gemini
    - Automatic retry with correction prompt on validation failure
    - Graceful fallback when LLM is unavailable
    
    ## Endpoints
    - `POST /feedback/process` - Generate pronunciation feedback
    - `GET /feedback/health` - Service health check
    - `GET /feedback/prompts/preview` - Preview loaded prompt templates (debug)
    - `GET /health` - Root health check
    """,
    version=settings.SERVICE_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # Allow all in development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health():
    """Root health check endpoint."""
    from app.services.logic import get_llm_client

    llm_client = get_llm_client()
    is_ready = llm_client is not None and llm_client.is_ready

    if not is_ready and not settings.MOCK_MODE:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "service": settings.SERVICE_NAME,
                "version": settings.SERVICE_VERSION,
                "model": settings.effective_model,
                "provider": settings.LLM_PROVIDER,
                "mock_mode": settings.MOCK_MODE,
            }
        )

    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "model": settings.effective_model,
        "provider": settings.LLM_PROVIDER,
        "mock_mode": settings.MOCK_MODE,
    }


@app.get("/", include_in_schema=False)
async def root():
    """Redirect to API documentation."""
    return RedirectResponse(url="/docs")


# Include feedback routes
app.include_router(router, prefix="/feedback", tags=["Feedback LLM"])
