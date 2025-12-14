from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional
from enum import Enum


class AudioSource(str, Enum):
    """Audio input source type"""
    FILE = "file"
    URL = "url"


class Word(BaseModel):
    """Word with timestamp information"""
    word: str = Field(..., description="The transcribed word")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    confidence: Optional[float] = Field(None, description="Confidence score (0-1)")


class Segment(BaseModel):
    """A segment of transcribed audio"""
    text: str = Field(..., description="Transcribed text for this segment")
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    words: List[Word] = Field(default_factory=list, description="Words in this segment")


class ASRRequest(BaseModel):
    """Request model for ASR processing via URL"""
    audio_url: HttpUrl = Field(..., description="URL of the audio file to transcribe")
    language: Optional[str] = Field(None, description="Language code (e.g., 'en'). Auto-detect if not provided")
    
    class Config:
        json_schema_extra = {
            "example": {
                "audio_url": "https://storage.example.com/audio/sample.wav",
                "language": "en"
            }
        }


class ASRResponse(BaseModel):
    """Response model for ASR processing"""
    transcript: str = Field(..., description="Full transcribed text")
    words: List[Word] = Field(default_factory=list, description="List of words with timestamps")
    segments: Optional[List[Segment]] = Field(None, description="Segments of transcribed audio")
    language: str = Field(..., description="Detected or specified language")
    duration: Optional[float] = Field(None, description="Audio duration in seconds")
    model_used: Optional[str] = Field(None, description="WhisperX model used for transcription")
    processing_time: Optional[float] = Field(None, description="Processing time in seconds")
    
    class Config:
        json_schema_extra = {
            "example": {
                "transcript": "Hello, this is a test recording.",
                "words": [
                    {"word": "Hello", "start": 0.0, "end": 0.5, "confidence": 0.98},
                    {"word": "this", "start": 0.6, "end": 0.8, "confidence": 0.95},
                    {"word": "is", "start": 0.9, "end": 1.0, "confidence": 0.97},
                    {"word": "a", "start": 1.1, "end": 1.2, "confidence": 0.92},
                    {"word": "test", "start": 1.3, "end": 1.6, "confidence": 0.99},
                    {"word": "recording", "start": 1.7, "end": 2.3, "confidence": 0.96}
                ],
                "language": "en",
                "duration": 2.5,
                "model_used": "base",
                "processing_time": 1.23
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    device: str = Field(..., description="Computing device (cuda/cpu)")
    model_loaded: bool = Field(..., description="Whether the ASR model is loaded")
    gpu_available: bool = Field(..., description="Whether GPU is available")
    gpu_name: Optional[str] = Field(None, description="GPU name if available")


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    code: Optional[str] = Field(None, description="Error code")


