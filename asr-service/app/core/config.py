from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    STORAGE_ENDPOINT: str = "http://minio:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    MOCK_MODE: bool = True

    class Config:
        env_file = ".env"


settings = Settings()

