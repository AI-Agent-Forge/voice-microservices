from pydantic import BaseModel, Field
from typing import List, Optional


class WordInput(BaseModel):
    """Word with start/end timestamps from ASR."""
    word: str = Field(..., description="The word text")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")


class Phoneme(BaseModel):
    """Phoneme alignment result."""
    symbol: str = Field(..., description="The phoneme symbol (ARPAbet)")
    word: Optional[str] = Field(None, description="Parent word this phoneme belongs to")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    confidence: float = Field(1.0, description="Confidence score for this phoneme (0-1)")


class WordAlignment(BaseModel):
    word: str
    start: float
    end: float
    score: Optional[float] = None
    phonemes: List[Phoneme]


class AlignmentRequest(BaseModel):
    audio_url: Optional[str] = Field(None, description="URL to the audio file")
    transcript: str = Field(..., description="Text transcript of the audio")
    words: Optional[List[WordInput]] = Field(None, description="Word-level timestamps from ASR")


class AlignmentResponse(BaseModel):
    phonemes: List[Phoneme] = Field(..., description="Flat list of phoneme alignments")
    duration: float = Field(..., description="Total audio duration in seconds")

