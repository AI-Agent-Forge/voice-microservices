# AgentForge Voice Microservices

This repository contains FastAPI microservices and an orchestrator that process a spoken audio clip end-to-end and return structured pronunciation analysis and audio artifacts.

## Services
- ASR
- Alignment
- Phoneme Map
- Phoneme Diff
- TTS
- Voice Conversion
- Feedback LLM
- Orchestrator

## Prerequisites
- Docker and Docker Compose
- NVIDIA Container Toolkit for GPU services (optional)

## Run
1. Copy environment example:
```
cp .env.example .env
```
2. Build and start:
```
DOCKER_BUILDKIT=0 docker-compose build --pull
docker-compose up --remove-orphans
```
3. Apply migrations inside the orchestrator container:
```
docker-compose exec orchestrator alembic upgrade head
```

## Endpoints
- Orchestrator: `http://localhost:8010/health` and `POST /process/`
- Microservices: exposed on ports 8001–8007

## Notes
- Set `MOCK_MODE=true` to return stubbed responses for local testing.
- GPU services use CUDA base images; for local CPU-only development the containers still build but heavy models are stubbed.

