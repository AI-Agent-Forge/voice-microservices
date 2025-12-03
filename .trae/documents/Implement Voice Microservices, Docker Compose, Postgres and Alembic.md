## Summary
- Implement all 8 FastAPI microservices, a FastAPI orchestrator, Postgres persistence, Alembic migrations with seed data, and a full docker-compose setup with Redis and MinIO. Follows the deliverable in `docs/project-deliverable.md:57` and structure in `docs/folder-structre.md:40`.

## Repository Layout
- Root folders:
  - `asr-service`, `alignment-service`, `phoneme-map-service`, `phoneme-diff-service`, `tts-service`, `voice-conversion-service`, `feedback-llm-service`, `pipeline-orchestrator`
  - `shared/` (config, storage, logging, utils)
  - `prompts/` (LLM prompt templates from `docs/prompt-templates.md`)
  - `tests/` (unit + integration, mock JSON + sample audio)
  - `docker-compose.yml`, `.env.example`, `README.md`
- Per service layout matches `docs/folder-structre.md:44` with `app/main.py`, `app/api/endpoints.py`, `app/services/logic.py`, `app/schemas/request_response.py`, `app/core/config.py`, `app/utils/`

## Microservices (FastAPI)
- `asr-service` (WhisperX, GPU optional)
  - `POST /process` UploadFile, returns transcript + word timestamps
  - `GET /health`
  - `MOCK_MODE` support
- `alignment-service`
  - `POST /process` audio + transcript → phoneme-level timestamps
  - Supports MFA or WhisperX alignment; `MOCK_MODE`
- `phoneme-map-service`
  - `POST /map` words → CMUdict phonemes; `MOCK_MODE`
- `phoneme-diff-service`
  - `POST /diff` user vs target phonemes → issues + severity; `MOCK_MODE`
- `tts-service` (XTTS/Coqui, GPU optional)
  - `POST /speak` text → audio URL (MinIO); `MOCK_MODE`
- `voice-conversion-service` (RVC, GPU optional)
  - `POST /convert` tts audio + user samples → converted audio URL; `MOCK_MODE`
- `feedback-llm-service`
  - `POST /feedback` transcript+diff+alignment → structured JSON
  - Loads prompts from `prompts/` (`docs/prompt-templates.md`)
- `pipeline-orchestrator`
  - `POST /process` accepts audio, stores temporarily (MinIO), calls all services, handles retries/timeouts, persists results, returns unified JSON
  - `GET /health`

## Orchestrator Flow
- Store uploaded audio to MinIO
- Call services in sequence: ASR → Alignment → Phoneme Map → Diff → TTS → Voice Conversion → Feedback LLM
- Persist task + artifacts + feedback to Postgres
- Return final JSON + audio URLs
- Follows `docs/project-deliverable.md:138-146` and diagram in `docs/diagram.md`

## Docker Compose
- Root `docker-compose.yml` integrating:
  - Infra: `redis`, `minio`, `postgres`
  - All 8 services + orchestrator with ports 8001–8007 and orchestrator 8010
  - Volumes: model caches, MinIO data, Postgres data
  - Env wiring (service URLs, storage, LLM keys)
- Base template derives from `docs/docker-details.md` with Postgres service enabled
- GPU services may use compose `deploy.resources.reservations.devices` (as notes in `docs/docker-file-details.md`)

## Dockerfiles
- Lightweight CPU images for all services plus GPU-enabled Dockerfiles for ASR, TTS, VC following `docs/docker-file-details.md`
- Standard entrypoint: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## Database Schema (Postgres)
- Purpose: Store orchestration tasks, artifacts, and feedback
- Tables:
  - `tasks`: `id` (uuid), `status`, `audio_uri`, `created_at`, `updated_at`
  - `artifacts`: `id`, `task_id` (fk), `type` (asr|align|phonemap|diff|tts|vc|feedback), `uri`, `metadata` (JSONB), `created_at`
  - `feedback`: `id`, `task_id` (fk), `payload` (JSONB), `created_at`
  - Optional: `users` if needed for later integration (kept minimal for MVP)
- Indices on `task_id`, `created_at`

## Alembic Setup & Seeding
- Alembic in `pipeline-orchestrator/`:
  - `alembic.ini`, `alembic/env.py`, `alembic/versions/`
  - `DATABASE_URL` env: `postgresql+psycopg2://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB`
- Migrations:
  - `0001_init_schema`: create `tasks`, `artifacts`, `feedback`
  - `0002_seed_sample`: seed minimal reference data (sample task row + example artifacts; demo feedback JSON)
- Run on container startup (or manual): `alembic upgrade head`

## Configuration
- `.env.example` including:
  - Postgres: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`
  - MinIO: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_ENDPOINT`
  - LLM: `LLM_PROVIDER`, `LLM_API_KEY`
  - Service URLs (for orchestrator): `ASR_URL`, `ALIGN_URL`, `PHONEME_MAP_URL`, `DIFF_URL`, `TTS_URL`, `VC_URL`, `FEEDBACK_URL`
  - `MOCK_MODE=true|false`

## Testing
- Unit tests per microservice: health checks and mock-mode payloads
- Integration tests (mock mode) for end-to-end orchestrator run
- Test assets in `tests/audio` and `tests/data` as outlined in `docs/get-started-here.md:321`

## Logging & Monitoring Hooks
- Structured logs per service: `request_id`, timestamps, duration, errors, aligned with `docs/project-deliverable.md:187-194`
- Code structured to plug in metrics later (Prometheus hooks left for future)

## Delivery & Verification
- Build images: `docker-compose build`
- Start stack: `docker-compose up`
- Apply migrations: orchestrator runs `alembic upgrade head` or manual in container
- Validate:
  - All health endpoints OK
  - Orchestrator mock flow returns unified JSON + audio URLs
  - Postgres contains seeded data and new task/artifact rows
  - Prompts load successfully in LLM service

## Next
- After approval, I will generate the full code skeletons, Dockerfiles, Compose, Alembic config + migrations and seeds, wire up endpoints and mock logic, and add tests, all conforming to your docs.