"""
Feedback LLM Service Configuration
Loads settings from environment variables with sensible defaults.
Supports both OpenAI and Gemini providers.
"""

import os
import logging
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)

# Resolve .env file path (may be in parent directory when running locally)
_env_file = ".env"
if not os.path.exists(_env_file):
    _parent_env = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env")
    if os.path.exists(_parent_env):
        _env_file = _parent_env


class Settings(BaseSettings):
    # Service identity
    SERVICE_NAME: str = "feedback-llm-service"
    SERVICE_VERSION: str = "1.0.0"

    # LLM Provider Configuration
    LLM_PROVIDER: str = "gemini"  # "gemini" | "openai"
    LLM_MODEL: str = ""  # Auto-selects based on provider if empty

    # Gemini
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"  # Backward compat

    # OpenAI
    OPENAI_API_KEY: str = ""

    # Prompts
    PROMPTS_DIR: str = "/app/prompts"

    # Behavior
    MOCK_MODE: bool = False
    MAX_RETRIES: int = 2  # 1 initial + 1 retry
    REQUEST_TIMEOUT: int = 30
    MAX_ISSUES: int = 10
    TEMPERATURE: float = 0.0  # Deterministic for structured JSON output
    MAX_TOKENS: int = 1500

    @property
    def effective_model(self) -> str:
        """Return the actual model name to use."""
        if self.LLM_MODEL:
            return self.LLM_MODEL
        if self.LLM_PROVIDER == "openai":
            return "gpt-4o"
        return self.GEMINI_MODEL  # default gemini model

    @property
    def effective_api_key(self) -> str:
        """Return the API key for the active provider."""
        if self.LLM_PROVIDER == "openai":
            return self.OPENAI_API_KEY
        return self.GEMINI_API_KEY

    model_config = {
        "env_file": _env_file,
        "extra": "ignore",
    }


def log_config():
    """Log service configuration on startup."""
    logger.info("📝 Feedback LLM Service Configuration:")
    logger.info(f"   Provider: {settings.LLM_PROVIDER}")
    logger.info(f"   Model: {settings.effective_model}")
    logger.info(f"   Mock Mode: {settings.MOCK_MODE}")
    logger.info(f"   API Key Set: {'Yes' if settings.effective_api_key else 'No'}")
    logger.info(f"   Prompts Dir: {settings.PROMPTS_DIR}")
    logger.info(f"   Max Retries: {settings.MAX_RETRIES}")
    logger.info(f"   Temperature: {settings.TEMPERATURE}")
    logger.info(f"   Max Tokens: {settings.MAX_TOKENS}")
    logger.info(f"   Request Timeout: {settings.REQUEST_TIMEOUT}s")


settings = Settings()
