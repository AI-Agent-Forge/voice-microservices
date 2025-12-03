Below is a production-ready **docker-compose.yml** tailored for your `agentforge-voice-microservices` repo. It includes all microservices you defined plus supporting infra (Redis for queues, MinIO for object storage, Postgres for optional metadata/dev use). Each microservice is set up to be **built from local context** (so dev engineer can implement `Dockerfile` per service). I also include a helpful **`.env.example`** and short instructions (including GPU notes).

> Save the YAML as `docker-compose.yml` in the repo root. Place a `Dockerfile` in each microservice folder (e.g., `asr-service/Dockerfile`) and implement the FastAPI app there. Use `docker-compose build` then `docker-compose up`.

---

```yaml
# docker-compose.yml
version: "3.8"

services:
  # -------------------------
  # Infrastructure services
  # -------------------------
  redis:
    image: redis:7-alpine
    container_name: af_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  minio:
    image: minio/minio:RELEASE.2024-09-01T00-00-00Z
    container_name: af_minio
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # MinIO Console
    volumes:
      - minio_data:/data
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: af_postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data
    restart: unless-stopped

  # -------------------------
  # Microservices (FastAPI)
  # -------------------------
  asr-service:
    build:
      context: ./asr-service
      dockerfile: Dockerfile
    container_name: af_asr
    env_file:
      - .env
    environment:
      - STORAGE_ENDPOINT=${MINIO_ENDPOINT}
      - STORAGE_ACCESS_KEY=${MINIO_ROOT_USER}
      - STORAGE_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - REDIS_URL=redis://redis:6379/0
    ports:
      - "8001:8000"
    depends_on:
      - redis
      - minio
    volumes:
      - models_cache:/models_cache
      - ./asr-service:/app
    restart: unless-stopped

  alignment-service:
    build:
      context: ./alignment-service
      dockerfile: Dockerfile
    container_name: af_alignment
    env_file:
      - .env
    environment:
      - STORAGE_ENDPOINT=${MINIO_ENDPOINT}
      - STORAGE_ACCESS_KEY=${MINIO_ROOT_USER}
      - STORAGE_SECRET_KEY=${MINIO_ROOT_PASSWORD}
    ports:
      - "8002:8000"
    depends_on:
      - minio
    volumes:
      - models_cache:/models_cache
      - ./alignment-service:/app
    restart: unless-stopped

  phoneme-map-service:
    build:
      context: ./phoneme-map-service
      dockerfile: Dockerfile
    container_name: af_phonemap
    env_file:
      - .env
    ports:
      - "8003:8000"
    volumes:
      - ./phoneme-map-service:/app
    restart: unless-stopped

  phoneme-diff-service:
    build:
      context: ./phoneme-diff-service
      dockerfile: Dockerfile
    container_name: af_phonediff
    env_file:
      - .env
    ports:
      - "8004:8000"
    volumes:
      - ./phoneme-diff-service:/app
    restart: unless-stopped

  tts-service:
    build:
      context: ./tts-service
      dockerfile: Dockerfile
    container_name: af_tts
    env_file:
      - .env
    environment:
      - STORAGE_ENDPOINT=${MINIO_ENDPOINT}
      - STORAGE_ACCESS_KEY=${MINIO_ROOT_USER}
      - STORAGE_SECRET_KEY=${MINIO_ROOT_PASSWORD}
    ports:
      - "8005:8000"
    volumes:
      - tts_models:/models_tts
      - ./tts-service:/app
    restart: unless-stopped

  voice-conversion-service:
    build:
      context: ./voice-conversion-service
      dockerfile: Dockerfile
    container_name: af_vc
    env_file:
      - .env
    environment:
      - STORAGE_ENDPOINT=${MINIO_ENDPOINT}
      - STORAGE_ACCESS_KEY=${MINIO_ROOT_USER}
      - STORAGE_SECRET_KEY=${MINIO_ROOT_PASSWORD}
      - REDIS_URL=redis://redis:6379/1
    ports:
      - "8006:8000"
    depends_on:
      - redis
      - minio
    volumes:
      - vc_models:/models_vc
      - ./voice-conversion-service:/app
    restart: unless-stopped

  feedback-llm-service:
    build:
      context: ./feedback-llm-service
      dockerfile: Dockerfile
    container_name: af_feedback
    env_file:
      - .env
    environment:
      - LLM_PROVIDER=${LLM_PROVIDER}   # e.g. openai or local
      - LLM_API_KEY=${LLM_API_KEY}
    ports:
      - "8007:8000"
    volumes:
      - ./feedback-llm-service:/app
    restart: unless-stopped

  orchestrator:
    build:
      context: ./pipeline-orchestrator
      dockerfile: Dockerfile
    container_name: af_orchestrator
    env_file:
      - .env
    environment:
      - REDIS_URL=redis://redis:6379/0
      - ASR_URL=http://asr-service:8000
      - ALIGN_URL=http://alignment-service:8000
      - PHONEME_MAP_URL=http://phoneme-map-service:8000
      - DIFF_URL=http://phoneme-diff-service:8000
      - TTS_URL=http://tts-service:8000
      - VC_URL=http://voice-conversion-service:8000
      - FEEDBACK_URL=http://feedback-llm-service:8000
      - STORAGE_ENDPOINT=${MINIO_ENDPOINT}
      - STORAGE_ACCESS_KEY=${MINIO_ROOT_USER}
      - STORAGE_SECRET_KEY=${MINIO_ROOT_PASSWORD}
    ports:
      - "8010:8000"
    depends_on:
      - asr-service
      - alignment-service
      - phoneme-map-service
      - phoneme-diff-service
      - tts-service
      - voice-conversion-service
      - feedback-llm-service
      - redis
      - minio
    volumes:
      - ./pipeline-orchestrator:/app
    restart: unless-stopped

# -------------------------
# Networks & Volumes
# -------------------------
networks:
  default:
    name: af_network

volumes:
  redis_data:
  minio_data:
  pg_data:
  models_cache:
  tts_models:
  vc_models:
```

---

### `.env.example`

Create a `.env` from this example in the repo root (do **not** commit secrets).

```
# .env.example
POSTGRES_USER=agentforge
POSTGRES_PASSWORD=change-me
POSTGRES_DB=agentforge_db

MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=http://minio:9000

LLM_PROVIDER=openai
LLM_API_KEY=sk-...

# optional: override ports if needed
ASR_PORT=8001

# other settings
REDIS_URL=redis://redis:6379/0
```

---

### Notes & Quick Start

1. **Place a Dockerfile** in each microservice folder (`asr-service/Dockerfile`, etc.). Each Dockerfile should:

   * Use Python 3.10+ base
   * Install requirements
   * Expose port 8000
   * Launch Uvicorn: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

2. **Build & run (dev):**

```bash
# copy env
cp .env.example .env
# build images and start
docker-compose build --pull
docker-compose up --remove-orphans
```

3. **GPU usage**

* Some services (ASR, TTS, VC) can benefit from GPU. Docker Compose v2 supports `--gpus` when running `docker run`, but `docker-compose` has limited portable GPU config.
* To run a service with GPU, you can:

  * Use Docker Compose but run GPU containers manually, or
  * On systems with NVIDIA Container Toolkit, add to the service block (may require docker-compose v2+ / compose plugin):

    ```yaml
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
    ```
  * Or run the ASR container with:

    ```bash
    docker run --gpus all -p 8001:8000 your_asr_image
    ```
* For local dev, start with CPU-only. Use cloud GPU when testing heavy models.

4. **MinIO**

* Console: `http://localhost:9001` (user/password from `.env`)
* Create a bucket named `audio` for storing audio artifacts (or let service create bucket).

5. **Redis**

* Used for orchestration / Celery / RQ. Configure your worker code to use the `REDIS_URL` from env.

6. **Exposing services**

* The Compose file maps each microservice to host ports 8001..8007 and orchestrator 8010. Adjust in `.env` if conflicts occur.

---

### Recommended next steps for backend engineer

* Add unit tests and a health-check for each service.
* Implement model download & caching into `models_cache` volume.
* Add readiness checks before orchestration uses services.
* Add observability (structured logs + basic metrics) pointing to console for now.
* Create a `docker-compose.override.yml` if you need special GPU runs.

