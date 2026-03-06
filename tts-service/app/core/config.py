from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """TTS Service Configuration - consistent with AgentForge microservices"""
    
    # Service Info
    SERVICE_NAME: str = "tts-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # MinIO/S3 Storage
    STORAGE_ENDPOINT: str = "http://minio:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "audio"
    STORAGE_REGION: str = "us-east-1"
    
    # Gemini TTS Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_TTS_MODEL: str = "gemini-2.5-flash-preview-tts"
    GEMINI_TTS_VOICE: str = "Kore"  # Default US English voice
    
    # Audio settings
    SAMPLE_RATE: int = 24000
    AUDIO_FORMAT: str = "wav"
    
    # Mock mode for testing without API key
    MOCK_MODE: bool = True
    
    # Supported languages
    SUPPORTED_LANGUAGES: List[str] = [
        "en-US", "en-IN", "de-DE", "es-US", "fr-FR", "hi-IN", 
        "id-ID", "it-IT", "ja-JP", "ko-KR", "pt-BR", "ru-RU",
        "nl-NL", "pl-PL", "th-TH", "tr-TR", "vi-VN", "ro-RO",
        "uk-UA", "bn-BD", "mr-IN", "ta-IN", "te-IN", "ar-EG"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

