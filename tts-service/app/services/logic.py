import io
import uuid
import wave
import boto3
from botocore.client import Config
from google import genai
from google.genai import types
from app.core.config import settings


# Available Gemini TTS voices (US English focused)
AVAILABLE_VOICES = [
    "Aoede", "Charon", "Fenrir", "Kore", "Puck",
    "Zephyr", "Orus", "Leda", "Helios", "Nova"
]


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


def _get_s3_client():
    """Get S3/MinIO client."""
    return boto3.client(
        "s3",
        endpoint_url=settings.STORAGE_ENDPOINT,
        aws_access_key_id=settings.STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.STORAGE_SECRET_KEY,
        config=Config(signature_version="s3v4"),
    )


def _upload_to_s3(audio_bytes: bytes, filename: str) -> str:
    """Upload audio to S3/MinIO and return the URL."""
    s3 = _get_s3_client()
    key = f"tts/{filename}"
    
    s3.put_object(
        Bucket=settings.STORAGE_BUCKET,
        Key=key,
        Body=audio_bytes,
        ContentType="audio/wav",
    )
    
    # Return the S3 URL
    return f"{settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET}/{key}"


async def run_service_logic(req):
    """Generate speech from text using Gemini TTS API."""
    
    # Return mock data if in mock mode or no API key
    if settings.MOCK_MODE or not settings.GEMINI_API_KEY:
        return _get_mock_response()
    
    try:
        # Determine voice to use
        voice_name = req.voice if req.voice and req.voice in AVAILABLE_VOICES else settings.GEMINI_TTS_VOICE
        
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
        wav_bytes = _create_wave_bytes(audio_data)
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.wav"
        
        # Upload to S3/MinIO
        audio_url = _upload_to_s3(wav_bytes, filename)
        
        return {
            "audio_url": audio_url,
            "voice": voice_name,
            "model": settings.GEMINI_TTS_MODEL,
            "duration_estimate": len(audio_data) / (24000 * 2),  # Approximate duration in seconds
        }
        
    except Exception as e:
        print(f"Error generating TTS: {e}")
        return _get_error_response(str(e))


def _get_mock_response() -> dict:
    """Return mock response for testing without API calls."""
    return {
        "audio_url": f"{settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET}/tts/mock_sample.wav",
        "voice": settings.GEMINI_TTS_VOICE,
        "model": settings.GEMINI_TTS_MODEL,
        "mock": True,
        "message": "Mock mode enabled. Set MOCK_MODE=false and provide GEMINI_API_KEY to generate real audio.",
    }


def _get_error_response(error: str) -> dict:
    """Return error response when API call fails."""
    return {
        "audio_url": None,
        "error": error,
        "message": "Failed to generate speech. Please check the logs for details.",
    }

