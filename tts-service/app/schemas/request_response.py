"""
TTS Service Request/Response Schemas
Consistent with AgentForge Voice Microservices patterns
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TTSVoice(str, Enum):
    """Available TTS voices for US English"""
    AOEDE = "Aoede"
    CHARON = "Charon"
    FENRIR = "Fenrir"
    KORE = "Kore"
    PUCK = "Puck"
    ZEPHYR = "Zephyr"
    ORUS = "Orus"
    LEDA = "Leda"
    HELIOS = "Helios"
    NOVA = "Nova"
    ALTAIR = "Altair"
    LYRA = "Lyra"
    ORION = "Orion"
    VEGA = "Vega"
    CLIO = "Clio"
    DORUS = "Dorus"
    ECHO = "Echo"
    FABLE = "Fable"
    COVE = "Cove"
    SKY = "Sky"
    SAGE = "Sage"
    EMBER = "Ember"
    VALE = "Vale"
    REEF = "Reef"
    ARIA = "Aria"
    IVY = "Ivy"
    STONE = "Stone"
    QUILL = "Quill"
    DRIFT = "Drift"
    BRIAR = "Briar"


class TTSRequest(BaseModel):
    """Request model for TTS synthesis - matches orchestrator expectations"""
    text: str = Field(
        ..., 
        description="The text to convert to speech",
        min_length=1,
        max_length=5000
    )
    voice: Optional[str] = Field(
        None,
        description="Voice name (e.g., 'Kore', 'Puck'). Uses default if not specified."
    )
    language: Optional[str] = Field(
        "en-US",
        description="Language code (e.g., 'en-US', 'en-IN')"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Hello, welcome to the pronunciation trainer!",
                "voice": "Kore",
                "language": "en-US"
            }
        }


class TTSResponse(BaseModel):
    """Response model for TTS synthesis"""
    audio_url: Optional[str] = Field(
        None, 
        description="URL to the generated audio file in storage"
    )
    voice: str = Field(..., description="Voice used for synthesis")
    model: str = Field(..., description="TTS model used")
    duration: Optional[float] = Field(
        None, 
        description="Audio duration in seconds"
    )
    sample_rate: int = Field(
        default=24000, 
        description="Audio sample rate in Hz"
    )
    format: str = Field(
        default="wav", 
        description="Audio format"
    )
    processing_time: Optional[float] = Field(
        None, 
        description="Processing time in seconds"
    )
    mock: Optional[bool] = Field(
        None, 
        description="Whether mock mode was used"
    )
    error: Optional[str] = Field(
        None, 
        description="Error message if synthesis failed"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "audio_url": "http://minio:9000/audio/tts/abc123.wav",
                "voice": "Kore",
                "model": "gemini-2.5-flash-preview-tts",
                "duration": 2.5,
                "sample_rate": 24000,
                "format": "wav",
                "processing_time": 1.23
            }
        }


class VoicesResponse(BaseModel):
    """Response model for available voices endpoint"""
    voices: List[str] = Field(..., description="List of available voice names")
    default_voice: str = Field(..., description="Default voice name")
    total: int = Field(..., description="Total number of available voices")
    
    class Config:
        json_schema_extra = {
            "example": {
                "voices": ["Aoede", "Charon", "Fenrir", "Kore", "Puck", "Zephyr"],
                "default_voice": "Kore",
                "total": 30
            }
        }


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status (ok/degraded)")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")
    model: str = Field(..., description="TTS model in use")
    default_voice: str = Field(..., description="Default voice configured")
    mock_mode: bool = Field(..., description="Whether mock mode is enabled")
    storage_connected: bool = Field(
        default=True, 
        description="Whether storage is accessible"
    )


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    code: Optional[str] = Field(None, description="Error code")
