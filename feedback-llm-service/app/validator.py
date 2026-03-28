"""
Feedback LLM Service — Output Validator

Validates LLM output against the FeedbackResponse Pydantic model
and cross-checks response data against request input.
"""

import re
import json
import logging
from typing import Tuple, Optional

from app.schemas.request_response import FeedbackResponse

logger = logging.getLogger(__name__)


class ValidationError(Exception):
    """Raised when LLM output fails validation."""
    pass


class FeedbackValidator:
    """Validates and normalizes LLM output."""

    @staticmethod
    def parse_response(raw: str) -> FeedbackResponse:
        """
        Parse raw LLM output string into a FeedbackResponse.

        1. Strip any markdown code fences if present
        2. Parse JSON safely
        3. Validate against FeedbackResponse Pydantic model

        Args:
            raw: Raw string from LLM

        Returns:
            Validated FeedbackResponse instance

        Raises:
            ValidationError: If parsing or validation fails
        """
        # Step 1: Strip markdown fences
        cleaned = FeedbackValidator._strip_markdown_fences(raw)

        # Step 2: Parse JSON
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as e:
            raise ValidationError(f"Invalid JSON: {e}. Raw output (first 500 chars): {raw[:500]}")

        if not isinstance(data, dict):
            raise ValidationError(f"Expected JSON object, got {type(data).__name__}")

        # Step 3: Normalize field names (handle minor LLM variations)
        data = FeedbackValidator._normalize_fields(data)

        # Step 4: Validate against Pydantic model
        try:
            response = FeedbackResponse(**data)
            return response
        except Exception as e:
            raise ValidationError(f"Pydantic validation failed: {e}")

    @staticmethod
    def validate_against_input(response: FeedbackResponse, request) -> list:
        """
        Cross-check response data against input request.

        Checks:
        - Words in issues exist in phoneme_diff
        - Timestamps fall within alignment range
        - Scores are in 0-100 range

        Returns list of warnings (does not raise — partial data is acceptable).
        """
        warnings = []

        # Get valid words from input
        valid_words = set()
        for diff in request.phoneme_diff:
            valid_words.add(diff.word.lower())
        for word in request.user_phonemes:
            valid_words.add(word.lower())

        # Get alignment time range
        min_time = float('inf')
        max_time = 0.0
        if request.alignment:
            for a in request.alignment:
                if a.start < min_time:
                    min_time = a.start
                if a.end > max_time:
                    max_time = a.end
        else:
            min_time = 0.0
            max_time = float('inf')

        # Check issues
        for issue in response.issues:
            # Check word exists in input
            if valid_words and issue.word.lower() not in valid_words:
                warnings.append(
                    f"Issue word '{issue.word}' not found in input phoneme_diff or user_phonemes"
                )

            # Check timestamps
            if issue.audio_timestamps:
                if issue.audio_timestamps.start < min_time or issue.audio_timestamps.end > max_time:
                    warnings.append(
                        f"Timestamps for '{issue.word}' "
                        f"({issue.audio_timestamps.start}-{issue.audio_timestamps.end}) "
                        f"outside alignment range ({min_time}-{max_time})"
                    )

        # Check scores
        for score_name in ['overall_score', 'fluency_score', 'accuracy_score', 'prosody_score']:
            score_val = getattr(response, score_name, None)
            if score_val is not None:
                if score_val < 0 or score_val > 100:
                    warnings.append(f"{score_name}={score_val} is outside 0-100 range")

        # Log warnings
        for w in warnings:
            logger.warning(f"[VALIDATION] {w}")

        return warnings

    @staticmethod
    def _strip_markdown_fences(raw: str) -> str:
        """Remove markdown code fences (```json ... ```) from LLM output."""
        stripped = raw.strip()

        # Pattern: ```json\n{...}\n``` or ```\n{...}\n```
        pattern = r'^```(?:json)?\s*\n?(.*?)\n?\s*```$'
        match = re.match(pattern, stripped, re.DOTALL)
        if match:
            return match.group(1).strip()

        # Also handle if there are leading/trailing backticks without full fence
        if stripped.startswith('```') and stripped.endswith('```'):
            inner = stripped[3:]
            if inner.startswith('json'):
                inner = inner[4:]
            inner = inner.rstrip('`').strip()
            return inner

        return stripped

    @staticmethod
    def _normalize_fields(data: dict) -> dict:
        """Normalize common field name variations from LLM output."""
        # Handle drills field variations
        if "drills" in data and isinstance(data["drills"], dict):
            drills = data["drills"]
            # word_practice → repeat_phrases (backward compat)
            if "word_practice" in drills and "repeat_phrases" not in drills:
                drills["repeat_phrases"] = drills.pop("word_practice")
            # sentence_practice → focus_phonemes (backward compat)
            if "sentence_practice" in drills and "focus_phonemes" not in drills:
                drills["focus_phonemes"] = drills.pop("sentence_practice")

        # Ensure fallback field defaults to false
        if "fallback" not in data:
            data["fallback"] = False

        return data
