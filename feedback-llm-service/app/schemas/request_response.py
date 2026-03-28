"""
Feedback LLM Service — Request & Response Schemas

Pydantic models for the structured input from the pipeline
and the structured output from the LLM feedback engine.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


# ============================================================
# Enums
# ============================================================

class SeverityLevel(str, Enum):
    """Severity level for pronunciation issues."""
    low = "low"
    medium = "medium"
    high = "high"


# ============================================================
# Request Models
# ============================================================

class AlignmentItem(BaseModel):
    """Single phoneme alignment entry from the alignment service."""
    phoneme: str = Field(..., description="ARPAbet phoneme symbol", example="HH")
    start: float = Field(..., description="Start time in seconds", example=0.0)
    end: float = Field(..., description="End time in seconds", example=0.15)


class PhonemeDiffItem(BaseModel):
    """A single phoneme diff result from the diff service."""
    word: str = Field(..., description="The word being compared", example="hello")
    user: List[str] = Field(default_factory=list, description="User-produced ARPAbet phonemes", example=["HH", "AA", "L", "OW"])
    target: List[str] = Field(default_factory=list, description="Target ARPAbet phonemes", example=["HH", "AH", "L", "OW"])
    issue: str = Field(default="none", description="Primary issue type (e.g. vowel_shift, consonant_error)", example="vowel_shift")
    severity: SeverityLevel = Field(default=SeverityLevel.low, description="Severity: low, medium, or high", example="medium")
    notes: str = Field(default="", description="Human-readable summary of differences", example="AA → AH")


class WordStressData(BaseModel):
    """Word-level stress information."""
    word: str = Field(default="", description="The word")
    stress_pattern: str = Field(default="", description="Stress pattern representation")
    is_correct: bool = Field(default=True, description="Whether stress placement is correct")


class SentenceRhythmData(BaseModel):
    """Sentence-level rhythm information."""
    speaking_rate: Optional[float] = Field(None, description="Words per minute")
    rhythm_quality: str = Field(default="normal", description="Rhythm quality assessment")


class StressData(BaseModel):
    """Stress and rhythm data from feature extraction."""
    word_level: List[WordStressData] = Field(default_factory=list, description="Word-level stress data")
    sentence_rhythm: Optional[SentenceRhythmData] = Field(None, description="Sentence-level rhythm data")


class FeedbackRequest(BaseModel):
    """
    Full input to the Feedback LLM Service.
    Aggregates outputs from ASR, alignment, phoneme-map, and phoneme-diff.
    """
    transcript: str = Field(
        ...,
        description="User's spoken transcript from ASR",
        example="Hello world"
    )
    alignment: List[AlignmentItem] = Field(
        default_factory=list,
        description="Phoneme-level alignment with timing from alignment service",
        example=[{"phoneme": "HH", "start": 0.0, "end": 0.15}]
    )
    user_phonemes: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="User's actual phonemes per word (ARPAbet)",
        example={"hello": ["HH", "AA", "L", "OW"]}
    )
    target_phonemes: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Target (correct US accent) phonemes per word (ARPAbet)",
        example={"hello": ["HH", "AH", "L", "OW"]}
    )
    phoneme_diff: List[PhonemeDiffItem] = Field(
        default_factory=list,
        description="Phoneme comparison results from the diff engine"
    )
    stress_data: Optional[StressData] = Field(
        None,
        description="Stress and rhythm data from feature extraction"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "transcript": "Hello world",
                "alignment": [
                    {"phoneme": "HH", "start": 0.0, "end": 0.15},
                    {"phoneme": "AH", "start": 0.15, "end": 0.30},
                    {"phoneme": "L", "start": 0.30, "end": 0.45},
                    {"phoneme": "OW", "start": 0.45, "end": 0.65}
                ],
                "user_phonemes": {"hello": ["HH", "AA", "L", "OW"], "world": ["W", "ER", "L", "D"]},
                "target_phonemes": {"hello": ["HH", "AH", "L", "OW"], "world": ["W", "ER", "L", "D"]},
                "phoneme_diff": [
                    {
                        "word": "hello",
                        "user": ["HH", "AA", "L", "OW"],
                        "target": ["HH", "AH", "L", "OW"],
                        "issue": "vowel_shift",
                        "severity": "medium",
                        "notes": "AA → AH"
                    }
                ],
                "stress_data": {
                    "word_level": [],
                    "sentence_rhythm": {"speaking_rate": 120.0, "rhythm_quality": "normal"}
                }
            }
        }


# ============================================================
# Response Models
# ============================================================

class AudioTimestamps(BaseModel):
    """Audio timestamp range for an issue."""
    start: float = Field(..., description="Start time in seconds", example=0.12)
    end: float = Field(..., description="End time in seconds", example=0.45)


class FeedbackIssue(BaseModel):
    """A single pronunciation issue identified by the LLM."""
    word: str = Field(..., description="Word with the pronunciation issue", example="hello")
    user_pronunciation: str = Field(
        default="",
        description="Space-joined ARPAbet phonemes the user produced",
        example="HH AA L OW"
    )
    target_pronunciation: str = Field(
        default="",
        description="Space-joined correct ARPAbet phonemes",
        example="HH AH L OW"
    )
    issue_type: str = Field(
        ...,
        description="Issue category: vowel_shift, consonant_error, stress, rhythm, schwa, intonation, substitution, insertion, deletion",
        example="vowel_shift"
    )
    explanation: str = Field(
        default="",
        description="Brief human-friendly explanation of the error",
        example="You used 'AA' (as in 'father') instead of 'AH' (as in 'but')."
    )
    fix_instructions: str = Field(
        default="",
        description="Actionable step-by-step correction instructions",
        example="Relax your jaw and produce a shorter, more central vowel sound."
    )
    audio_timestamps: Optional[AudioTimestamps] = Field(
        None,
        description="Start and end timestamps in the original audio"
    )
    severity: SeverityLevel = Field(
        default=SeverityLevel.medium,
        description="Issue severity: low, medium, or high",
        example="medium"
    )


class Drills(BaseModel):
    """Practice drills generated by the LLM."""
    minimal_pairs: List[str] = Field(
        default_factory=list,
        description="Minimal pair exercises contrasting problematic sounds",
        example=["ship–sheep", "bed–bad"]
    )
    repeat_phrases: List[str] = Field(
        default_factory=list,
        description="Phrases to repeat for practice",
        example=["Hello, how are you today?"]
    )
    focus_phonemes: List[str] = Field(
        default_factory=list,
        description="ARPAbet phonemes to focus on",
        example=["AH", "OW"]
    )


class FeedbackResponse(BaseModel):
    """
    Complete structured feedback output from the LLM.
    This is the final response returned to the pipeline/frontend.
    """
    overall_summary: str = Field(
        default="No feedback generated.",
        description="2-3 sentence summary of pronunciation performance",
        example="Good effort! Most words were pronounced correctly. Focus on the vowel in 'hello'."
    )
    issues: List[FeedbackIssue] = Field(
        default_factory=list,
        description="List of identified pronunciation issues"
    )
    drills: Drills = Field(
        default_factory=Drills,
        description="Targeted practice drills"
    )
    overall_score: Optional[float] = Field(
        None,
        description="Overall pronunciation score (0-100)",
        example=78.5,
        ge=0,
        le=100
    )
    fluency_score: Optional[float] = Field(
        None,
        description="Fluency sub-score (0-100)",
        example=82.0,
        ge=0,
        le=100
    )
    accuracy_score: Optional[float] = Field(
        None,
        description="Phoneme accuracy sub-score (0-100)",
        example=74.0,
        ge=0,
        le=100
    )
    prosody_score: Optional[float] = Field(
        None,
        description="Prosody/rhythm/stress sub-score (0-100)",
        example=80.0,
        ge=0,
        le=100
    )
    strengths: List[str] = Field(
        default_factory=list,
        description="List of pronunciation strengths",
        example=["Clear consonant articulation", "Good speaking pace"]
    )
    improvement_tips: List[str] = Field(
        default_factory=list,
        description="Prioritized improvement suggestions",
        example=["Practice the AH vowel in stressed syllables"]
    )
    encouragement: str = Field(
        default="Keep practicing!",
        description="Encouraging closing message",
        example="Great start! With focused practice on vowels, you'll improve quickly."
    )
    fallback: bool = Field(
        default=False,
        description="True if LLM failed and this is a fallback response",
        example=False
    )

    class Config:
        json_schema_extra = {
            "example": {
                "overall_summary": "Good effort! 4 out of 5 words were pronounced correctly.",
                "issues": [
                    {
                        "word": "hello",
                        "user_pronunciation": "HH AA L OW",
                        "target_pronunciation": "HH AH L OW",
                        "issue_type": "vowel_shift",
                        "explanation": "The vowel in the first syllable was too open.",
                        "fix_instructions": "Use a shorter, more relaxed central vowel.",
                        "audio_timestamps": {"start": 0.12, "end": 0.45},
                        "severity": "medium"
                    }
                ],
                "drills": {
                    "minimal_pairs": ["cup–cop", "luck–lock"],
                    "repeat_phrases": ["Hello, how are you?"],
                    "focus_phonemes": ["AH"]
                },
                "overall_score": 78.5,
                "fluency_score": 82.0,
                "accuracy_score": 74.0,
                "prosody_score": 80.0,
                "strengths": ["Clear consonant sounds", "Good speaking pace"],
                "improvement_tips": ["Focus on the AH vowel sound"],
                "encouragement": "Great start! Keep practicing!",
                "fallback": False
            }
        }
