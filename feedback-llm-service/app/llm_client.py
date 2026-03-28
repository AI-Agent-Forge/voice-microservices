"""
Feedback LLM Service — LLM Client Abstraction

Supports both OpenAI and Google Gemini providers.
Configurable via LLM_PROVIDER environment variable.
"""

import time
import logging
import asyncio
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMTimeoutError(Exception):
    """Raised when the LLM API call times out."""
    pass


class LLMClientError(Exception):
    """Raised when the LLM client fails to initialize."""
    pass


class LLMClient:
    """
    Abstraction layer for LLM API calls.
    Supports OpenAI and Google Gemini providers.
    """

    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.model = settings.effective_model
        self.api_key = settings.effective_api_key
        self.temperature = settings.TEMPERATURE
        self.max_tokens = settings.MAX_TOKENS
        self.timeout = settings.REQUEST_TIMEOUT
        self._client = None
        self._initialized = False

    def initialize(self):
        """Initialize the LLM client. Call during app startup."""
        if not self.api_key:
            logger.warning(f"No API key configured for {self.provider}. Service will run in degraded mode.")
            return

        try:
            if self.provider == "openai":
                self._init_openai()
            elif self.provider == "gemini":
                self._init_gemini()
            else:
                raise LLMClientError(f"Unsupported LLM provider: {self.provider}")

            self._initialized = True
            logger.info(f"LLM client initialized: provider={self.provider}, model={self.model}")

        except Exception as e:
            logger.error(f"Failed to initialize LLM client: {e}")
            raise LLMClientError(f"Failed to initialize {self.provider} client: {e}")

    def _init_openai(self):
        """Initialize OpenAI client."""
        try:
            from openai import AsyncOpenAI
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                timeout=self.timeout
            )
        except ImportError:
            raise LLMClientError("openai package not installed. Run: pip install openai")

    def _init_gemini(self):
        """Initialize Google Gemini client."""
        try:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        except ImportError:
            raise LLMClientError("google-genai package not installed. Run: pip install google-genai")

    @property
    def is_ready(self) -> bool:
        """Check if the client is initialized and ready."""
        return self._initialized and self._client is not None

    async def call(self, system_prompt: str, user_prompt: str) -> str:
        """
        Call the LLM with system and user prompts.

        Args:
            system_prompt: The system instruction prompt
            user_prompt: The user message with data

        Returns:
            Raw string response from the LLM

        Raises:
            LLMTimeoutError: If the call exceeds timeout
            LLMClientError: If the client is not initialized
        """
        if not self.is_ready:
            raise LLMClientError("LLM client not initialized. Check API key and provider configuration.")

        start_time = time.time()

        try:
            if self.provider == "openai":
                result = await self._call_openai(system_prompt, user_prompt)
            elif self.provider == "gemini":
                result = await self._call_gemini(system_prompt, user_prompt)
            else:
                raise LLMClientError(f"Unsupported provider: {self.provider}")

            elapsed = time.time() - start_time
            logger.info(
                f"LLM call complete: provider={self.provider}, model={self.model}, "
                f"prompt_chars={len(system_prompt) + len(user_prompt)}, "
                f"response_chars={len(result)}, latency_ms={int(elapsed * 1000)}"
            )
            return result

        except asyncio.TimeoutError:
            elapsed = time.time() - start_time
            logger.error(f"LLM call timed out after {elapsed:.1f}s")
            raise LLMTimeoutError(f"LLM API call timed out after {self.timeout}s")

        except LLMTimeoutError:
            raise

        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"LLM call failed after {elapsed:.1f}s: {e}")
            raise

    async def _call_openai(self, system_prompt: str, user_prompt: str) -> str:
        """Call OpenAI API with structured JSON output."""
        response = await asyncio.wait_for(
            self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"},
            ),
            timeout=self.timeout
        )

        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI API")

        logger.info(
            f"OpenAI usage: prompt_tokens={response.usage.prompt_tokens}, "
            f"completion_tokens={response.usage.completion_tokens}"
        )
        return content

    async def _call_gemini(self, system_prompt: str, user_prompt: str) -> str:
        """Call Google Gemini API with structured JSON output."""
        from google.genai import types

        # Gemini's generate_content is synchronous, run in executor
        def _sync_call():
            response = self._client.models.generate_content(
                model=self.model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    response_mime_type="application/json",
                    temperature=self.temperature,
                ),
            )
            return response.text

        result = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _sync_call),
            timeout=self.timeout
        )

        if not result:
            raise ValueError("Empty response from Gemini API")

        return result
