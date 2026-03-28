"""
Tests for FeedbackRequest and FeedbackResponse Pydantic schemas.
"""

import pytest
import json
import os

# Add parent dir so we can import app
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas.request_response import (
    FeedbackRequest,
    FeedbackResponse,
    FeedbackIssue,
    Drills,
    SeverityLevel,
    AlignmentItem,
    PhonemeDiffItem,
)


class TestFeedbackRequest:
    """Test FeedbackRequest schema validation."""

    def test_minimal_request(self):
        """A minimal valid request needs only a transcript."""
        req = FeedbackRequest(transcript="Hello world")
        assert req.transcript == "Hello world"
        assert req.alignment == []
        assert req.user_phonemes == {}
        assert req.target_phonemes == {}
        assert req.phoneme_diff == []
        assert req.stress_data is None

    def test_full_request_from_json(self):
        """Load and validate a full mock request from JSON fixture."""
        fixture_path = os.path.join(os.path.dirname(__file__), "data", "mock_feedback_request.json")
        with open(fixture_path) as f:
            data = json.load(f)

        req = FeedbackRequest(**data)
        assert req.transcript == "Hello world"
        assert len(req.alignment) == 8
        assert len(req.phoneme_diff) == 2
        assert req.phoneme_diff[0].word == "hello"
        assert req.phoneme_diff[0].severity == SeverityLevel.medium

    def test_alignment_parsing(self):
        """Alignment items parse correctly."""
        req = FeedbackRequest(
            transcript="test",
            alignment=[{"phoneme": "T", "start": 0.0, "end": 0.1}],
        )
        assert req.alignment[0].phoneme == "T"
        assert req.alignment[0].start == 0.0
        assert req.alignment[0].end == 0.1

    def test_severity_enum(self):
        """Severity levels validate as enum values."""
        diff = PhonemeDiffItem(word="test", severity="high")
        assert diff.severity == SeverityLevel.high

        diff2 = PhonemeDiffItem(word="test", severity="low")
        assert diff2.severity == SeverityLevel.low


class TestFeedbackResponse:
    """Test FeedbackResponse schema validation."""

    def test_default_response(self):
        """Default response has sensible defaults."""
        resp = FeedbackResponse()
        assert resp.overall_summary == "No feedback generated."
        assert resp.issues == []
        assert resp.drills.minimal_pairs == []
        assert resp.drills.repeat_phrases == []
        assert resp.drills.focus_phonemes == []
        assert resp.overall_score is None
        assert resp.fallback is False
        assert resp.encouragement == "Keep practicing!"

    def test_full_response(self):
        """Full response with all fields validates correctly."""
        resp = FeedbackResponse(
            overall_summary="Good job!",
            issues=[
                FeedbackIssue(
                    word="hello",
                    user_pronunciation="HH AA L OW",
                    target_pronunciation="HH AH L OW",
                    issue_type="vowel_shift",
                    severity="medium",
                )
            ],
            drills=Drills(
                minimal_pairs=["cup-cop"],
                repeat_phrases=["Hello world"],
                focus_phonemes=["AH"],
            ),
            overall_score=78.5,
            fluency_score=82.0,
            accuracy_score=74.0,
            prosody_score=80.0,
            strengths=["Clear consonants"],
            improvement_tips=["Focus on AH vowel"],
            encouragement="Great work!",
            fallback=False,
        )
        assert resp.overall_score == 78.5
        assert len(resp.issues) == 1
        assert resp.issues[0].issue_type == "vowel_shift"
        assert resp.drills.focus_phonemes == ["AH"]
        assert resp.fallback is False

    def test_fallback_response(self):
        """Fallback response is correctly structured."""
        resp = FeedbackResponse(
            overall_summary="Feedback unavailable.",
            fallback=True,
        )
        assert resp.fallback is True
        assert resp.issues == []

    def test_score_range_constraints(self):
        """Scores must be 0-100."""
        # Valid range
        resp = FeedbackResponse(overall_score=0.0, accuracy_score=100.0)
        assert resp.overall_score == 0.0
        assert resp.accuracy_score == 100.0

    def test_json_serialization(self):
        """Response can be serialized to JSON."""
        resp = FeedbackResponse(
            overall_summary="Test",
            overall_score=85.0,
            issues=[],
        )
        data = resp.model_dump()
        assert isinstance(data, dict)
        assert data["overall_score"] == 85.0

        json_str = resp.model_dump_json()
        assert isinstance(json_str, str)
        parsed = json.loads(json_str)
        assert parsed["overall_score"] == 85.0
