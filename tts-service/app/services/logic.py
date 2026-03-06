"""
TTS Service Logic - Gemini TTS Implementation
Handles text-to-speech synthesis with storage upload
Consistent with AgentForge Voice Microservices patterns
"""

import io
import uuid
import wave
import logging
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError, EndpointConnectionError
from typing import Dict, Any, Optional

from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Available Gemini TTS voices (30 options as per spec)
AVAILABLE_VOICES = [
    "Aoede", "Charon", "Fenrir", "Kore", "Puck",
    "Zephyr", "Orus", "Leda", "Helios", "Nova",
    "Altair", "Lyra", "Orion", "Vega", "Clio",
    "Dorus", "Echo", "Fable", "Cove", "Sky",
    "Sage", "Ember", "Vale", "Reef", "Aria",
    "Ivy", "Stone", "Quill", "Drift", "Briar"
]

# S3 client singleton
_s3_client = None


def _get_s3_client():
    """Get S3/MinIO client (singleton pattern)."""
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=settings.STORAGE_ENDPOINT,
            aws_access_key_id=settings.STORAGE_ACCESS_KEY,
            aws_secret_access_key=settings.STORAGE_SECRET_KEY,
            config=Config(signature_version="s3v4"),
            region_name=settings.STORAGE_REGION
        )
    return _s3_client


def check_storage_connection() -> bool:
    """Check if storage (MinIO/S3) is accessible."""
    try:
        s3 = _get_s3_client()
        s3.head_bucket(Bucket=settings.STORAGE_BUCKET)
        return True
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == '404':
            # Bucket doesn't exist, try to create it
            try:
                s3 = _get_s3_client()
                s3.create_bucket(Bucket=settings.STORAGE_BUCKET)
                logger.info(f"Created bucket: {settings.STORAGE_BUCKET}")
                return True
            except Exception as create_err:
                logger.warning(f"Failed to create bucket: {create_err}")
                return False
        logger.warning(f"Storage connection check failed: {e}")
        return False
    except EndpointConnectionError:
        logger.warning("Cannot connect to storage endpoint")
        return False
    except Exception as e:
        logger.warning(f"Storage check error: {e}")
        return False


def _create_wave_bytes(pcm_data: bytes, channels: int = 1, rate: int = 24000, sample_width: int = 2) -> bytes:
    """Convert PCM data to WAV format in memory."""
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(rate)
        wf.writeframes(pcm_data)
    buffer.seek(0)
    return buffer.getvalue()


def _ensure_bucket_exists():
    """Ensure the storage bucket exists, create if not."""
    try:
        s3 = _get_s3_client()
        s3.head_bucket(Bucket=settings.STORAGE_BUCKET)
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', '')
        if error_code == '404':
            try:
                s3 = _get_s3_client()
                s3.create_bucket(Bucket=settings.STORAGE_BUCKET)
                logger.info(f"Created bucket: {settings.STORAGE_BUCKET}")
            except Exception as create_err:
                logger.error(f"Failed to create bucket: {create_err}")
                raise RuntimeError(f"Cannot create storage bucket: {create_err}")
        else:
            raise


def _upload_to_s3(audio_bytes: bytes, filename: str) -> str:
    """Upload audio to S3/MinIO and return the URL."""
    _ensure_bucket_exists()
    
    s3 = _get_s3_client()
    key = f"tts/{filename}"
    
    s3.put_object(
        Bucket=settings.STORAGE_BUCKET,
        Key=key,
        Body=audio_bytes,
        ContentType="audio/wav",
    )
    
    logger.info(f"Uploaded audio to storage: {key}")
    
    # Return the S3 URL
    return f"{settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET}/{key}"


def _calculate_duration(audio_bytes: bytes) -> float:
    """Calculate actual audio duration from WAV bytes."""
    try:
        buffer = io.BytesIO(audio_bytes)
        with wave.open(buffer, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            duration = frames / float(rate)
            return round(duration, 3)
    except Exception:
        return 0.0


async def run_service_logic(req) -> Dict[str, Any]:
    """
    Generate speech from text using Gemini TTS API.
    
    Args:
        req: TTSRequest object with text, voice, and language
        
    Returns:
        Dictionary with audio_url, voice, model, duration, etc.
    """
    
    # Return mock data if in mock mode or no API key
    if settings.MOCK_MODE or not settings.GEMINI_API_KEY:
        logger.info("Mock mode enabled, returning mock response")
        return _get_mock_response(req)
    
    try:
        # Import Gemini SDK
        from google import genai
        from google.genai import types
        
        # Validate and determine voice to use
        voice_name = _validate_voice(req.voice)
        
        logger.info(f"Generating TTS: voice={voice_name}, text_length={len(req.text)}")
        
        # Initialize Gemini client
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        
        # Generate speech
        response = client.models.generate_content(
            model=settings.GEMINI_TTS_MODEL,
            contents=req.text,
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=voice_name,
                        )
                    )
                ),
            )
        )
        
        # Extract audio data
        audio_data = response.candidates[0].content.parts[0].inline_data.data
        
        # Convert PCM to WAV
        wav_bytes = _create_wave_bytes(audio_data, rate=settings.SAMPLE_RATE)
        
        # Calculate actual duration
        duration = _calculate_duration(wav_bytes)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.wav"
        
        # Upload to S3/MinIO
        audio_url = _upload_to_s3(wav_bytes, filename)
        
        logger.info(f"TTS generated successfully: {filename}, duration={duration}s")
        
        return {
            "audio_url": audio_url,
            "voice": voice_name,
            "model": settings.GEMINI_TTS_MODEL,
            "duration": duration,
            "sample_rate": settings.SAMPLE_RATE,
            "format": settings.AUDIO_FORMAT,
        }
        
    except ImportError as e:
        logger.error(f"Gemini SDK not available: {e}")
        raise RuntimeError("Gemini TTS SDK not installed. Please install google-genai package.")
    except Exception as e:
        logger.error(f"TTS generation failed: {e}")
        raise RuntimeError(f"TTS generation failed: {str(e)}")


def _validate_voice(voice: Optional[str]) -> str:
    """Validate and return voice name, defaulting if invalid."""
    if voice is None:
        return settings.GEMINI_TTS_VOICE
    
    # Case-insensitive voice matching
    voice_lower = voice.lower()
    for available_voice in AVAILABLE_VOICES:
        if available_voice.lower() == voice_lower:
            return available_voice
    
    # Voice not found, use default
    logger.warning(f"Voice '{voice}' not found, using default: {settings.GEMINI_TTS_VOICE}")
    return settings.GEMINI_TTS_VOICE


def _get_mock_response(req) -> Dict[str, Any]:
    """Return mock response for testing without API calls."""
    voice_name = _validate_voice(req.voice if hasattr(req, 'voice') else None)
    
    # Estimate duration based on text length (rough: ~150 words per minute, ~5 chars per word)
    estimated_duration = round(len(req.text) / (150 * 5 / 60), 2)
    
    return {
        "audio_url": f"{settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET}/tts/mock_sample.wav",
        "voice": voice_name,
        "model": settings.GEMINI_TTS_MODEL,
        "duration": estimated_duration,
        "sample_rate": settings.SAMPLE_RATE,
        "format": settings.AUDIO_FORMAT,
        "mock": True,
    }

