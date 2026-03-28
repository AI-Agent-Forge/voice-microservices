"""
Tests for the feedback service logic (mock mode, validation, fallback).
"""

import pytest
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Force mock mode for testing
os.environ["MOCK_MODE"] = "true"

from app.schemas.request_response import FeedbackRequest, FeedbackResponse
from app.validator import FeedbackValidator, ValidationError


class TestFeedbackValidator:
    """Test validator parsing and cross-checking."""

    def test_parse_valid_json(self):
        """Valid JSON parses into FeedbackResponse."""
        raw = json.dumps({
            "overall_summary": "Good pronunciation.",
            "issues": [],
            "drills": {
                "minimal_pairs": [],
                "repeat_phrases": [],
                "focus_phonemes": []
            },
            "overall_score": 85.0,
            "fluency_score": 88.0,
            "accuracy_score": 82.0,
            "prosody_score": 86.0,
            "strengths": ["Clear speech"],
            "improvement_tips": [],
            "encouragement": "Keep it up!",
            "fallback": False
        })
        result = FeedbackValidator.parse_response(raw)
        assert isinstance(result, FeedbackResponse)
        assert result.overall_score == 85.0
        assert result.fallback is False

    def test_parse_markdown_fenced_json(self):
        """Strips ```json ... ``` fences before parsing."""
        raw = '```json\n{"overall_summary": "Test", "issues": [], "drills": {"minimal_pairs": [], "repeat_phrases": [], "focus_phonemes": []}}\n```'
        result = FeedbackValidator.parse_response(raw)
        assert result.overall_summary == "Test"

    def test_parse_invalid_json_raises(self):
        """Invalid JSON raises ValidationError."""
        with pytest.raises(ValidationError, match="Invalid JSON"):
            FeedbackValidator.parse_response("this is not json")

    def test_parse_non_object_raises(self):
        """Non-object JSON raises ValidationError."""
        with pytest.raises(ValidationError, match="Expected JSON object"):
            FeedbackValidator.parse_response("[1, 2, 3]")

    def test_normalize_word_practice_to_repeat_phrases(self):
        """Backward compat: word_practice → repeat_phrases."""
        raw = json.dumps({
            "overall_summary": "Test",
            "issues": [],
            "drills": {
                "minimal_pairs": [],
                "word_practice": ["hello"],
                "sentence_practice": ["AH"]
            }
        })
        result = FeedbackValidator.parse_response(raw)
        assert result.drills.repeat_phrases == ["hello"]
        assert result.drills.focus_phonemes == ["AH"]

    def test_validate_against_input_warns_on_unknown_word(self):
        """Issues with words not in input generate warnings."""
        response = FeedbackResponse(
            overall_summary="Test",
            issues=[{
                "word": "unknown_word",
                "issue_type": "vowel_shift",
                "severity": "medium"
            }]
        )
        request = FeedbackRequest(
            transcript="hello world",
            phoneme_diff=[{"word": "hello", "severity": "medium", "issue": "vowel_shift"}]
        )
        warnings = FeedbackValidator.validate_against_input(response, request)
        assert any("unknown_word" in w for w in warnings)

    def test_validate_against_input_no_warnings_for_valid(self):
        """No warnings when all words match input."""
        response = FeedbackResponse(
            overall_summary="Test",
            issues=[{
                "word": "hello",
                "issue_type": "vowel_shift",
                "severity": "medium"
            }]
        )
        request = FeedbackRequest(
            transcript="hello world",
            phoneme_diff=[{"word": "hello", "severity": "medium", "issue": "vowel_shift"}]
        )
        warnings = FeedbackValidator.validate_against_input(response, request)
        assert len(warnings) == 0


class TestMockMode:
    """Test that mock mode returns valid responses."""

    @pytest.mark.asyncio
    async def test_mock_response_structure(self):
        """Mock mode returns a valid FeedbackResponse-shaped dict."""
        from app.services.logic import _get_mock_response

        request = FeedbackRequest(
            transcript="Hello world",
            phoneme_diff=[
                {
                    "word": "hello",
                    "user": ["HH", "AA", "L", "OW"],
                    "target": ["HH", "AH", "L", "OW"],
                    "issue": "vowel_shift",
                    "severity": "medium",
                    "notes": "AA → AH"
                }
            ]
        )
        result = _get_mock_response(request)
        assert "overall_summary" in result
        assert "issues" in result
        assert "drills" in result
        assert "overall_score" in result
        assert "fallback" in result
        assert result["fallback"] is False

    @pytest.mark.asyncio
    async def test_mock_response_validates_as_schema(self):
        """Mock response can be parsed by FeedbackResponse model."""
        from app.services.logic import _get_mock_response

        request = FeedbackRequest(
            transcript="Test sentence",
            phoneme_diff=[]
        )
        result = _get_mock_response(request)
        response = FeedbackResponse(**result)
        assert response.overall_score is not None
        assert response.fallback is False


class TestFallbackResponse:
    """Test fallback response generation."""

    def test_fallback_has_correct_structure(self):
        """Fallback response has all required fields."""
        from app.services.logic import _get_fallback_response

        request = FeedbackRequest(transcript="test")
        result = _get_fallback_response("test error", request)

        assert result["fallback"] is True
        assert result["overall_score"] is None
        assert result["issues"] == []
        assert "drills" in result

        # Validate it can be parsed by the schema
        response = FeedbackResponse(**result)
        assert response.fallback is True
