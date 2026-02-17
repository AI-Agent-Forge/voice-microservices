from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_NAME: str = "phoneme-map-service"
    SERVICE_VERSION: str = "1.0.0"
    MOCK_MODE: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

