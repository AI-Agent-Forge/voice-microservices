from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    REDIS_URL: str = "redis://redis:6379/0"
    ASR_URL: str = "http://asr-service:8000"
    ALIGN_URL: str = "http://alignment-service:8000"
    PHONEME_MAP_URL: str = "http://phoneme-map-service:8000"
    DIFF_URL: str = "http://phoneme-diff-service:8000"
    TTS_URL: str = "http://tts-service:8000"
    VC_URL: str = "http://voice-conversion-service:8000"
    FEEDBACK_URL: str = "http://feedback-llm-service:8000"
    STORAGE_ENDPOINT: str = "http://minio:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    DATABASE_URL: str = "postgresql+psycopg2://agentforge:change-me@postgres:5432/agentforge_db"
    MOCK_MODE: bool = True

    class Config:
        env_file = ".env"


settings = Settings()

