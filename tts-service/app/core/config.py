from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MinIO/S3 Storage
    STORAGE_ENDPOINT: str = "http://minio:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET: str = "audio"
    
    # Gemini TTS
    GEMINI_API_KEY: str = ""
    GEMINI_TTS_MODEL: str = "gemini-2.5-flash-preview-tts"
    GEMINI_TTS_VOICE: str = "Kore"  # Default US English voice
    
    MOCK_MODE: bool = True

    class Config:
        env_file = ".env"


settings = Settings()

