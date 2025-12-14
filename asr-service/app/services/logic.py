"""
ASR Service Logic - WhisperX Implementation
Handles audio transcription with word-level timestamps
"""

import os
import shutil
import tempfile
import time
from pathlib import Path
from typing import Optional, Dict, Any
import httpx
import torch
import structlog

from app.core.config import settings

# Configure structured logging
logger = structlog.get_logger(__name__)

# Global model instance (singleton pattern)
_whisperx_model = None
_align_model = None
_align_metadata = None


def get_model():
    """
    Load WhisperX model (singleton pattern).
    Model is loaded once and reused for all requests.
    """
    global _whisperx_model
    
    if _whisperx_model is not None:
        return _whisperx_model
    
    if settings.MOCK_MODE:
        logger.info("Mock mode enabled, skipping model load")
        return None
    
    try:
        import whisperx
        
        logger.info(
            "Loading WhisperX model",
            model=settings.WHISPER_MODEL,
            device=settings.DEVICE,
            compute_type=settings.compute_type
        )
        
        # Load the WhisperX model
        _whisperx_model = whisperx.load_model(
            settings.WHISPER_MODEL,
            device=settings.DEVICE,
            compute_type=settings.compute_type,
            download_root=settings.MODEL_CACHE_DIR
        )
        
        logger.info("WhisperX model loaded successfully")
        return _whisperx_model
        
    except ImportError:
        logger.error("WhisperX not installed, falling back to mock mode")
        return None
    except Exception as e:
        logger.error("Failed to load WhisperX model", error=str(e))
        raise RuntimeError(f"Failed to load WhisperX model: {e}")


def get_align_model(language_code: str = "en"):
    """
    Load WhisperX alignment model for word-level timestamps.
    """
    global _align_model, _align_metadata
    
    if settings.MOCK_MODE:
        return None, None
    
    try:
        import whisperx
        
        # Only reload if language changed
        if _align_model is None:
            logger.info("Loading alignment model", language=language_code)
            _align_model, _align_metadata = whisperx.load_align_model(
                language_code=language_code,
                device=settings.DEVICE
            )
            logger.info("Alignment model loaded successfully")
        
        return _align_model, _align_metadata
        
    except Exception as e:
        logger.warning("Failed to load alignment model", error=str(e))
        return None, None


def save_temp_audio(file) -> str:
    """
    Save uploaded file to temporary location.
    Returns the path to the temporary file.
    """
    try:
        # Create temp directory if it doesn't exist
        os.makedirs(settings.TEMP_DIR, exist_ok=True)
        
        # Determine file extension
        filename = getattr(file, 'filename', 'audio.wav')
        suffix = Path(filename).suffix or '.wav'
        
        # Create temp file
        fd, path = tempfile.mkstemp(suffix=suffix, dir=settings.TEMP_DIR)
        with os.fdopen(fd, 'wb') as tmp:
            shutil.copyfileobj(file.file, tmp)
        
        logger.debug("Saved temp audio file", path=path)
        return path
        
    except Exception as e:
        logger.error("Error saving temp file", error=str(e))
        raise RuntimeError(f"Failed to save uploaded file: {e}")


async def download_audio_from_url(audio_url: str) -> str:
    """
    Download audio file from URL to temporary location.
    Returns the path to the downloaded file.
    """
    try:
        os.makedirs(settings.TEMP_DIR, exist_ok=True)
        
        # Extract file extension from URL
        url_path = str(audio_url).split('?')[0]  # Remove query params
        suffix = Path(url_path).suffix or '.wav'
        
        # Download the file
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(str(audio_url))
            response.raise_for_status()
        
        # Save to temp file
        fd, path = tempfile.mkstemp(suffix=suffix, dir=settings.TEMP_DIR)
        with os.fdopen(fd, 'wb') as tmp:
            tmp.write(response.content)
        
        logger.debug("Downloaded audio from URL", url=str(audio_url), path=path)
        return path
        
    except httpx.HTTPError as e:
        logger.error("Failed to download audio", url=str(audio_url), error=str(e))
        raise RuntimeError(f"Failed to download audio from URL: {e}")
    except Exception as e:
        logger.error("Error downloading audio", error=str(e))
        raise RuntimeError(f"Failed to download audio: {e}")


def cleanup_temp_file(path: str):
    """Clean up temporary file"""
    try:
        if path and os.path.exists(path):
            os.remove(path)
            logger.debug("Cleaned up temp file", path=path)
    except Exception as e:
        logger.warning("Failed to cleanup temp file", path=path, error=str(e))


def transcribe_with_whisperx(audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Transcribe audio using WhisperX with word-level alignment.
    
    Args:
        audio_path: Path to the audio file
        language: Optional language code (auto-detect if None)
    
    Returns:
        Dictionary with transcript, words, segments, language, duration
    """
    import whisperx
    
    model = get_model()
    if model is None:
        raise RuntimeError("WhisperX model not loaded")
    
    start_time = time.time()
    
    # Load audio
    logger.info("Loading audio file", path=audio_path)
    audio = whisperx.load_audio(audio_path)
    duration = len(audio) / 16000  # WhisperX uses 16kHz sample rate
    
    # Check duration limit
    if duration > settings.MAX_AUDIO_DURATION_SECONDS:
        raise ValueError(f"Audio duration ({duration:.1f}s) exceeds maximum allowed ({settings.MAX_AUDIO_DURATION_SECONDS}s)")
    
    # Transcribe
    logger.info("Transcribing audio", duration=f"{duration:.2f}s")
    result = model.transcribe(
        audio,
        batch_size=settings.WHISPER_BATCH_SIZE,
        language=language or settings.WHISPER_LANGUAGE
    )
    
    detected_language = result.get("language", language or "en")
    
    # Align for word-level timestamps
    logger.info("Aligning transcript for word timestamps")
    align_model, align_metadata = get_align_model(detected_language)
    
    if align_model is not None:
        result = whisperx.align(
            result["segments"],
            align_model,
            align_metadata,
            audio,
            device=settings.DEVICE,
            return_char_alignments=False
        )
    
    # Extract words from segments
    words = []
    segments = []
    full_transcript = []
    
    for segment in result.get("segments", []):
        segment_words = []
        for word_info in segment.get("words", []):
            word_data = {
                "word": word_info.get("word", "").strip(),
                "start": round(word_info.get("start", 0.0), 3),
                "end": round(word_info.get("end", 0.0), 3),
                "confidence": round(word_info.get("score", 0.0), 3) if "score" in word_info else None
            }
            words.append(word_data)
            segment_words.append(word_data)
        
        segments.append({
            "text": segment.get("text", "").strip(),
            "start": round(segment.get("start", 0.0), 3),
            "end": round(segment.get("end", 0.0), 3),
            "words": segment_words
        })
        full_transcript.append(segment.get("text", "").strip())
    
    processing_time = time.time() - start_time
    
    logger.info(
        "Transcription complete",
        word_count=len(words),
        processing_time=f"{processing_time:.2f}s"
    )
    
    return {
        "transcript": " ".join(full_transcript),
        "words": words,
        "segments": segments,
        "language": detected_language,
        "duration": round(duration, 3),
        "model_used": settings.WHISPER_MODEL,
        "processing_time": round(processing_time, 3)
    }


def get_mock_response() -> Dict[str, Any]:
    """
    Return mock response for testing without GPU/model.
    """
    return {
        "transcript": "This is a mock transcription for testing purposes. The actual WhisperX model is not loaded.",
        "words": [
            {"word": "This", "start": 0.0, "end": 0.3, "confidence": 0.95},
            {"word": "is", "start": 0.35, "end": 0.5, "confidence": 0.97},
            {"word": "a", "start": 0.55, "end": 0.65, "confidence": 0.92},
            {"word": "mock", "start": 0.7, "end": 1.0, "confidence": 0.98},
            {"word": "transcription", "start": 1.1, "end": 1.8, "confidence": 0.96},
            {"word": "for", "start": 1.85, "end": 2.0, "confidence": 0.94},
            {"word": "testing", "start": 2.1, "end": 2.5, "confidence": 0.97},
            {"word": "purposes", "start": 2.6, "end": 3.1, "confidence": 0.95},
        ],
        "segments": [
            {
                "text": "This is a mock transcription for testing purposes.",
                "start": 0.0,
                "end": 3.1,
                "words": []
            }
        ],
        "language": "en",
        "duration": 3.5,
        "model_used": "mock",
        "processing_time": 0.01
    }


async def run_service_logic(file=None, audio_url: str = None, language: str = None) -> Dict[str, Any]:
    """
    Main entry point for ASR processing.
    Supports both file upload and audio URL.
    
    Args:
        file: Uploaded file object (optional)
        audio_url: URL to audio file (optional)
        language: Language code for transcription (optional)
    
    Returns:
        ASR response dictionary
    """
    if file is None and audio_url is None:
        raise ValueError("Either file or audio_url must be provided")
    
    # Mock mode for testing
    if settings.MOCK_MODE:
        logger.info("Running in mock mode")
        return get_mock_response()
    
    temp_file_path = None
    
    try:
        # Get audio file path
        if file is not None:
            temp_file_path = save_temp_audio(file)
        else:
            temp_file_path = await download_audio_from_url(audio_url)
        
        # Transcribe
        result = transcribe_with_whisperx(temp_file_path, language)
        return result
        
    except Exception as e:
        logger.error("ASR processing failed", error=str(e))
        raise
        
    finally:
        # Cleanup
        if temp_file_path:
            cleanup_temp_file(temp_file_path)


def is_model_loaded() -> bool:
    """Check if the WhisperX model is loaded"""
    return _whisperx_model is not None or settings.MOCK_MODE


def get_gpu_info() -> Dict[str, Any]:
    """Get GPU information"""
    if torch.cuda.is_available():
        return {
            "available": True,
            "name": torch.cuda.get_device_name(0),
            "memory_total": torch.cuda.get_device_properties(0).total_memory,
            "memory_allocated": torch.cuda.memory_allocated(0)
        }
    return {"available": False, "name": None}

