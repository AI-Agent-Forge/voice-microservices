"""
Feedback LLM Service Logic — LLM-Powered Pronunciation Coaching

Orchestrates prompt rendering, LLM calling, validation, retry,
and fallback for generating structured pronunciation feedback.
"""

import json
import logging
from typing import Dict, Any

from app.core.config import settings
from app.llm_client import LLMClient, LLMTimeoutError, LLMClientError
from app.prompt_loader import PromptLoader
from app.validator import FeedbackValidator, ValidationError
from app.schemas.request_response import FeedbackResponse

logger = logging.getLogger(__name__)

# Singletons initialized at startup
_llm_client: LLMClient = None
_prompt_loader: PromptLoader = None


def get_llm_client() -> LLMClient:
    """Get the LLM client singleton."""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMClient()
    return _llm_client


def get_prompt_loader() -> PromptLoader:
    """Get the prompt loader singleton."""
    global _prompt_loader
    if _prompt_loader is None:
        _prompt_loader = PromptLoader()
    return _prompt_loader


def init_service():
    """Initialize service components. Called during app lifespan startup."""
    global _llm_client, _prompt_loader

    # Initialize prompt loader
    _prompt_loader = PromptLoader()
    _prompt_loader.initialize()

    # Initialize LLM client
    _llm_client = LLMClient()
    if settings.effective_api_key and not settings.MOCK_MODE:
        try:
            _llm_client.initialize()
        except LLMClientError as e:
            logger.error(f"LLM client initialization failed: {e}")
            # Don't fail startup — service can still return fallback/mock
    else:
        logger.info("LLM client not initialized (no API key or mock mode)")


async def run_service_logic(req) -> Dict[str, Any]:
    """
    Main entry point for the feedback service.

    1. Check mock mode
    2. Build prompts from request data
    3. Call LLM with retry on validation failure
    4. Validate and return response
    """
    logger.info("Processing feedback request...")

    # Mock mode
    if settings.MOCK_MODE or not settings.effective_api_key:
        logger.info("Running in mock mode")
        return _get_mock_response(req)

    prompt_loader = get_prompt_loader()
    llm_client = get_llm_client()

    if not llm_client.is_ready:
        logger.warning("LLM client not ready, returning fallback")
        return _get_fallback_response("LLM client not initialized", req)

    try:
        # Build prompts
        system_prompt = prompt_loader.render_system_prompt()
        user_prompt = prompt_loader.render_user_prompt(req)

        logger.info(f"Prompts built: system={len(system_prompt)} chars, user={len(user_prompt)} chars")

        # First attempt
        raw_response = await llm_client.call(system_prompt, user_prompt)

        try:
            response = FeedbackValidator.parse_response(raw_response)
            # Cross-check against input
            warnings = FeedbackValidator.validate_against_input(response, req)
            if warnings:
                logger.info(f"Validation warnings ({len(warnings)}): {warnings[:3]}")
            return response.model_dump()

        except ValidationError as e:
            logger.warning(f"First attempt validation failed: {e}")

            # Retry with correction prompt
            correction = prompt_loader.render_correction_prompt(str(e))
            logger.info("Retrying with correction prompt...")

            try:
                retry_response = await llm_client.call(system_prompt, user_prompt + "\n\n" + correction)
                response = FeedbackValidator.parse_response(retry_response)
                FeedbackValidator.validate_against_input(response, req)
                logger.info("Retry succeeded")
                return response.model_dump()

            except (ValidationError, Exception) as retry_e:
                logger.error(f"Retry also failed: {retry_e}")
                logger.info("Returning fallback response")
                return _get_fallback_response(f"Validation failed after retry: {retry_e}", req)

    except LLMTimeoutError as e:
        logger.error(f"LLM timeout: {e}")
        raise  # Let the router handle 504

    except Exception as e:
        logger.error(f"Feedback generation failed: {e}")
        return _get_fallback_response(str(e), req)


# ============================================================
# Mock & Fallback Responses
# ============================================================

def _get_fallback_response(error: str, req) -> dict:
    """Return safe fallback response when LLM fails."""
    logger.info(f"Generating fallback response. Reason: {error}")
    return {
        "overall_summary": "Feedback temporarily unavailable.",
        "issues": [],
        "drills": {
            "minimal_pairs": [],
            "repeat_phrases": [],
            "focus_phonemes": [],
        },
        "overall_score": None,
        "fluency_score": None,
        "accuracy_score": None,
        "prosody_score": None,
        "strengths": [],
        "improvement_tips": [],
        "encouragement": "Keep practicing!",
        "fallback": True,
    }


def _get_mock_response(req) -> dict:
    """
    Return a rich mock response that mirrors real LLM output structure.
    Useful for frontend development and testing without API keys.
    """
    # Analyze the diff data to build realistic mock issues
    mock_issues = []
    for diff_item in req.phoneme_diff[:settings.MAX_ISSUES]:
        if diff_item.severity.value != "low" or diff_item.issue != "none":
            # Find timestamps from alignment
            timestamps = None
            for align in req.alignment:
                phoneme = getattr(align, "phoneme", "")
                if phoneme and diff_item.user and phoneme == diff_item.user[0]:
                    timestamps = {"start": align.start, "end": align.end}
                    break

            user_phon = " ".join(diff_item.user) if diff_item.user else ""
            target_phon = " ".join(diff_item.target) if diff_item.target else ""

            mock_issues.append({
                "word": diff_item.word,
                "user_pronunciation": user_phon,
                "target_pronunciation": target_phon,
                "issue_type": diff_item.issue,
                "explanation": f"The pronunciation of '{diff_item.word}' differs from the target US accent pattern ({diff_item.notes or diff_item.issue}).",
                "fix_instructions": f"Practice saying '{diff_item.word}' with the target phonemes: {target_phon}. Focus on the vowel and consonant placement.",
                "audio_timestamps": timestamps,
                "severity": diff_item.severity.value,
            })

    # Build summary
    total_words = len(req.transcript.split()) if req.transcript else 0
    issue_count = len(mock_issues)
    correct_count = len(req.phoneme_diff) - issue_count

    if issue_count == 0:
        summary = f"Excellent pronunciation! All {total_words} words were pronounced correctly with standard US accent patterns."
        overall_score = 95.0
    elif issue_count <= 2:
        summary = f"Good effort! {correct_count} out of {len(req.phoneme_diff)} words were pronounced correctly. Focus on the {issue_count} highlighted issue(s)."
        overall_score = 78.0
    else:
        summary = f"Keep practicing! {issue_count} words need improvement out of {len(req.phoneme_diff)} analyzed."
        overall_score = 55.0

    return {
        "overall_summary": summary,
        "issues": mock_issues,
        "drills": {
            "minimal_pairs": ["ship–sheep", "bit–beat", "cat–cut", "pull–pool"],
            "repeat_phrases": list(set(d.word for d in req.phoneme_diff if d.severity.value != "low"))[:5] or ["hello", "world"],
            "focus_phonemes": ["AH", "OW", "TH"],
        },
        "overall_score": overall_score,
        "fluency_score": overall_score + 3,
        "accuracy_score": overall_score - 4,
        "prosody_score": overall_score + 1,
        "strengths": [
            "Clear consonant articulation",
            "Good speaking pace",
            "Consistent volume",
        ],
        "improvement_tips": [
            "Focus on the AH vowel in stressed syllables",
            "Practice the TH sound in 'the', 'this', 'that'",
        ],
        "encouragement": "Great start! With focused practice, you'll improve quickly.",
        "fallback": False,
    }
