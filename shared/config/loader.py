from pydantic_settings import BaseSettings


class SharedSettings(BaseSettings):
    MINIO_ENDPOINT: str = "http://minio:9000"
    MINIO_ROOT_USER: str = "minioadmin"
    MINIO_ROOT_PASSWORD: str = "minioadmin"

    class Config:
        env_file = ".env"


shared_settings = SharedSettings()

