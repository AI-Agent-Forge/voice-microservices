from pydantic_settings import BaseSettings
from typing import Optional
import torch


class Settings(BaseSettings):
    """ASR Service Configuration"""
    
    # Service Info
    SERVICE_NAME: str = "asr-service"
    SERVICE_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # WhisperX Model Settings
    WHISPER_MODEL: str = "base"  # Options: tiny, base, small, medium, large-v2, large-v3
    WHISPER_COMPUTE_TYPE: str = "float16"  # float16 for GPU, int8 for CPU
    WHISPER_BATCH_SIZE: int = 16  # Reduce if running out of GPU memory
    WHISPER_LANGUAGE: Optional[str] = "en"  # Set to None for auto-detect
    
    # Device Configuration
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    
    # HuggingFace Token (required for speaker diarization, optional for basic ASR)
    HF_TOKEN: Optional[str] = None
    
    # Storage Configuration (MinIO/S3)
    STORAGE_ENDPOINT: str = "http://minio:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "audio-files"
    STORAGE_SECURE: bool = False
    
    # Redis Configuration
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Audio Processing
    MAX_AUDIO_DURATION_SECONDS: int = 600  # 10 minutes max
    SUPPORTED_AUDIO_FORMATS: list = ["wav", "mp3", "m4a", "webm", "ogg", "flac"]
    TEMP_DIR: str = "/tmp/asr_temp"
    
    # Model Cache
    MODEL_CACHE_DIR: str = "/models_cache"
    
    # Mock Mode - SET TO FALSE FOR REAL WORK
    MOCK_MODE: bool = False

    class Config:
        env_file = ".env"
        extra = "ignore"
    
    @property
    def compute_type(self) -> str:
        """Return appropriate compute type based on device"""
        if self.DEVICE == "cpu":
            return "int8"
        return self.WHISPER_COMPUTE_TYPE


settings = Settings()

# Log configuration on startup
def log_config():
    """Log current configuration"""
    print(f"🎤 ASR Service Configuration:")
    print(f"   Model: {settings.WHISPER_MODEL}")
    print(f"   Device: {settings.DEVICE}")
    print(f"   Compute Type: {settings.compute_type}")
    print(f"   Mock Mode: {settings.MOCK_MODE}")
    print(f"   CUDA Available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"   GPU: {torch.cuda.get_device_name(0)}")


