"""
TTS Service Tests
Tests for the Text-to-Speech microservice
"""

import pytest
import httpx


TTS_SERVICE_URL = "http://localhost:8005"


@pytest.fixture
def tts_client():
    """Create HTTP client for TTS service."""
    return httpx.Client(base_url=TTS_SERVICE_URL, timeout=30.0)


class TestTTSHealth:
    """Test health endpoints."""
    
    def test_root_health(self, tts_client):
        """Test root health endpoint."""
        response = tts_client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "tts-service"
        assert "version" in data
        assert "model" in data
        assert "mock_mode" in data
    
    def test_tts_health(self, tts_client):
        """Test TTS-specific health endpoint."""
        response = tts_client.get("/tts/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["ok", "degraded"]
        assert data["service"] == "tts-service"


class TestTTSVoices:
    """Test voices endpoint."""
    
    def test_list_voices(self, tts_client):
        """Test listing available voices."""
        response = tts_client.get("/tts/voices")
        assert response.status_code == 200
        data = response.json()
        assert "voices" in data
        assert "default_voice" in data
        assert "total" in data
        assert len(data["voices"]) == data["total"]
        assert data["total"] == 30  # Should have 30 voices
        assert "Kore" in data["voices"]  # Default voice should be in list


class TestTTSSynthesis:
    """Test TTS synthesis endpoint."""
    
    def test_process_basic(self, tts_client):
        """Test basic TTS synthesis."""
        response = tts_client.post(
            "/tts/process",
            json={"text": "Hello, this is a test."}
        )
        assert response.status_code == 200
        data = response.json()
        assert "audio_url" in data
        assert "voice" in data
        assert "model" in data
        assert data["voice"] == "Kore"  # Default voice
    
    def test_process_with_voice(self, tts_client):
        """Test TTS synthesis with specific voice."""
        response = tts_client.post(
            "/tts/process",
            json={
                "text": "Hello, this is a test.",
                "voice": "Puck"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["voice"] == "Puck"
    
    def test_process_empty_text(self, tts_client):
        """Test TTS synthesis with empty text should fail."""
        response = tts_client.post(
            "/tts/process",
            json={"text": ""}
        )
        assert response.status_code == 422  # Validation error
    
    def test_process_long_text(self, tts_client):
        """Test TTS synthesis with longer text."""
        long_text = "This is a longer test sentence. " * 10
        response = tts_client.post(
            "/tts/process",
            json={"text": long_text}
        )
        assert response.status_code == 200
        data = response.json()
        assert "audio_url" in data
        assert "duration" in data


class TestTTSInfo:
    """Test info endpoint."""
    
    def test_service_info(self, tts_client):
        """Test service info endpoint."""
        response = tts_client.get("/tts/info")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "tts-service"
        assert "model" in data
        assert "default_voice" in data
        assert "available_voices" in data
        assert "supported_languages" in data
        assert "sample_rate" in data
        assert data["sample_rate"] == 24000


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

