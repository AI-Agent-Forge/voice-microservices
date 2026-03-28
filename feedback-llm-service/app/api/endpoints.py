"""
Feedback LLM Service — API Endpoints

Provides the /feedback/process, /feedback/health, and /feedback/prompts/preview endpoints.
"""

import time
import logging
from fastapi import APIRouter, HTTPException
from app.schemas.request_response import FeedbackRequest, FeedbackResponse
from app.services.logic import run_service_logic, get_prompt_loader, get_llm_client
from app.llm_client import LLMTimeoutError

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get(
    "/health",
    summary="Feedback Health Check",
    description="Check if the Feedback LLM service is healthy and ready to process requests",
    tags=["Feedback LLM"],
)
def feedback_health():
    """Feedback-specific health check with LLM status."""
    from app.core.config import settings

    llm_client = get_llm_client()
    is_ready = llm_client is not None and llm_client.is_ready

    status = "ok" if (is_ready or settings.MOCK_MODE) else "degraded"

    return {
        "status": status,
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "model": settings.effective_model,
        "provider": settings.LLM_PROVIDER,
        "mock_mode": settings.MOCK_MODE,
    }


@router.post(
    "/process",
    response_model=FeedbackResponse,
    summary="Generate Pronunciation Feedback",
    description="Accepts pipeline data (transcript, alignment, phonemes, diff, stress) and returns structured LLM feedback with issues, drills, scores, and improvement tips.",
    responses={
        504: {"description": "LLM Timeout — the language model did not respond in time"},
        500: {"description": "Internal Server Error"},
    },
    tags=["Feedback LLM"],
)
async def generate_feedback(req: FeedbackRequest):
    """
    Main feedback generation endpoint.

    Receives aggregated output from the ASR, alignment, phoneme-map,
    and phoneme-diff services, then generates expert pronunciation
    coaching feedback via LLM.

    **Process:**
    1. Build prompts from input data
    2. Call LLM (OpenAI or Gemini) with structured JSON output
    3. Validate response against schema
    4. Retry once on validation failure
    5. Return fallback if both attempts fail
    """
    start_time = time.time()

    logger.info("=" * 50)
    logger.info("FEEDBACK LLM SERVICE - Processing Request")
    logger.info("=" * 50)
    logger.info(f"Transcript: '{req.transcript}'")
    logger.info(f"Alignment items: {len(req.alignment)}")
    logger.info(f"User phoneme words: {len(req.user_phonemes)}")
    logger.info(f"Target phoneme words: {len(req.target_phonemes)}")
    logger.info(f"Diff items: {len(req.phoneme_diff)}")
    logger.info(f"Stress data: {'present' if req.stress_data else 'none'}")

    try:
        result = await run_service_logic(req)

        processing_time = time.time() - start_time
        logger.info(f"Feedback generated in {processing_time:.2f}s")
        logger.info(f"Issues found: {len(result.get('issues', []))}")
        logger.info(f"Overall score: {result.get('overall_score', 'N/A')}")
        logger.info(f"Fallback: {result.get('fallback', False)}")
        logger.info("=" * 50)

        return result

    except LLMTimeoutError as e:
        processing_time = time.time() - start_time
        logger.error(f"LLM timeout after {processing_time:.2f}s: {e}")
        raise HTTPException(
            status_code=504,
            detail={
                "error": "LLM Timeout",
                "message": str(e),
                "processing_time": round(processing_time, 3),
            }
        )

    except Exception as e:
        processing_time = time.time() - start_time
        logger.error(f"Feedback generation failed after {processing_time:.2f}s: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": True,
                "message": f"Feedback generation failed: {str(e)}",
                "processing_time": round(processing_time, 3),
            }
        )


@router.get(
    "/prompts/preview",
    summary="Preview Loaded Prompts (Debug)",
    description="Returns the currently loaded system and user prompt templates for debugging purposes.",
    tags=["Feedback LLM"],
)
def preview_prompts():
    """
    Debug endpoint to preview loaded prompt templates.
    Useful for verifying prompt content without making an LLM call.
    """
    prompt_loader = get_prompt_loader()
    if prompt_loader is None:
        return {"system_prompt": "Not loaded", "user_prompt_template": "Not loaded"}

    return prompt_loader.get_raw_templates()
