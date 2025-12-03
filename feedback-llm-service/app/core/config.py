from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    LLM_PROVIDER: str = "openai"
    LLM_API_KEY: str = ""
    MOCK_MODE: bool = True

    class Config:
        env_file = ".env"


settings = Settings()

