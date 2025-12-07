from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    MOCK_MODE: bool = True

    class Config:
        env_file = ".env"


settings = Settings()

