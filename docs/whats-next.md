# Developer Runbook — Step-by-step: Process a Saved Audio Clip Through All Voice Microservices

*(One document that tells a backend engineer exactly what to run, in what order, what to verify, and example requests/responses.)*

---

## Prerequisites (before you start)

1. Repo cloned and up-to-date with `agentforge-voice-microservices` contents (services, `docker-compose.yml`, `prompts/`, `tests/`).
2. `.env` file created from `.env.example` with production/dev credentials (MinIO, Redis, LLM keys). **Do not commit secrets.**
3. Docker & Docker Compose installed. If using GPU models, NVIDIA Container Toolkit installed and host has available GPU drivers.
4. Create MinIO bucket `audio` (or configure S3) and ensure credentials in `.env`.
5. Sample audio file saved and accessible: path example `./tests/audio/hello-world.wav` or saved audio record location known in NodeJS backend / MinIO URL.

---

## Start infra & services (single command)

From repo root:

```bash
# copy example env then edit .env as necessary
cp .env.example .env

# Build and start services (use --build first time)
docker-compose up --build -d
# Check logs
docker-compose logs -f
```

If you plan to run GPU-only services locally and have GPUs, follow GPU instructions in Dockerfile docs; otherwise start CPU mode or set `MOCK_MODE=true` for faster local testing.

---

## Global verification (health)

Confirm infra is healthy:

```bash
# Redis
docker exec -it af_redis redis-cli ping

# MinIO console: http://localhost:9001 (login with MINIO_ROOT_USER/PASSWORD)

# Verify containers
docker ps --format "{{.Names}}\t{{.Status}}"
```

For each FastAPI service check health endpoint (examples below use localhost ports defined in `docker-compose.yml`):

```bash
curl http://localhost:8001/asr/health        # ASR
curl http://localhost:8002/alignment/health  # Alignment
curl http://localhost:8003/phonemap/health   # Phoneme Map
curl http://localhost:8004/diff/health       # Phoneme Diff
curl http://localhost:8005/tts/health        # TTS
curl http://localhost:8006/vc/health         # Voice Conversion
curl http://localhost:8007/feedback/health   # Feedback LLM
curl http://localhost:8010/orchestrator/health # Orchestrator
```

If a health endpoint returns `{"status":"ok"}` — proceed.

---

## Workflow: Process saved audio — ordered steps

> For each step I list **what must be implemented/configured before calling**, **example request**, **expected response**, and **how to verify**.

---

### Step 1 — ASR Service (WhisperX)

**Purpose:** Convert audio → transcript + word timestamps.

**Before you call:**

* WhisperX model loaded on service (check startup logs).
* Service must have access to audio (local path or MinIO URL).
* If using local file, `multipart/form-data` upload endpoint available.

**Example request (file upload):**

```bash
curl -X POST "http://localhost:8001/asr/process" \
  -F "file=@./tests/audio/hello-world.wav"
```

**Example response:**

```json
{
  "transcript": "hello world",
  "words": [
    {"word":"hello","start":0.12,"end":0.45},
    {"word":"world","start":0.55,"end":1.00}
  ],
  "language":"en"
}
```

**Verify:**

* Transcript sensible for audio.
* Word timestamps are ascending and within audio length.
* Check logs: model load time, inference time metrics.

**If failed:** check model cache path volume, GPU availability, file format (use `ffmpeg` to re-encode to WAV).

---

### Step 2 — Alignment Service

**Purpose:** Produce phoneme-level timestamps from audio + transcript.

**Before you call:**

* Alignment engine (MFA or WhisperX alignment) installed and path configured.
* Input can be `audio_url` (MinIO) or local path + transcript.

**Example request (JSON):**

```bash
curl -X POST "http://localhost:8002/alignment/process" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url":"http://minio:9000/audio/hello-world.wav",
    "transcript":"hello world"
  }'
```

**Example response:**

```json
{
  "phonemes": [
    {"phoneme":"HH","start":0.12,"end":0.18},
    {"phoneme":"AH","start":0.18,"end":0.32},
    {"phoneme":"L","start":0.32,"end":0.38},
    {"phoneme":"OW","start":0.38,"end":0.45}
  ]
}
```

**Verify:**

* Phoneme timestamps align with word timestamps (word spans contain corresponding phonemes).
* No large gaps/overlaps beyond expected.

**If failed:** confirm transcript matches audio; alignment needs reasonable transcript. Try ASR transcript first.

---

### Step 3 — Phoneme Map Service (CMUdict)

**Purpose:** Map each word → canonical target phoneme list (US accent).

**Before you call:**

* CMUdict loaded in service memory.
* Provide lowercased/normalized words.

**Example request:**

```bash
curl -X POST "http://localhost:8003/phoneme-map/process" \
  -H "Content-Type: application/json" \
  -d '{"words":["hello","world"]}'
```

**Example response:**

```json
{
  "map": {
    "hello":["HH","AH","L","OW"],
    "world":["W","ER","L","D"]
  }
}
```

**Verify:**

* Mapping exists for common words.
* For OOV words service returns sensible fallback (grapheme-to-phoneme or note OOV).

---

### Step 4 — Phoneme Diff Service

**Purpose:** Compare user phonemes (from alignment) vs target phonemes → produce issue list.

**Before you call:**

* Provide user phoneme sequences keyed by word and target map from Step 3.
* Diff rules configured (vowel shifts, stress, retroflexes).

**Example request:**

```bash
curl -X POST "http://localhost:8004/diff/process" \
  -H "Content-Type: application/json" \
  -d '{
    "user_phonemes":{"hello":["HH","AA","L","O"]},
    "target_phonemes":{"hello":["HH","AH","L","OW"]}
  }'
```

**Example response:**

```json
{
  "comparisons":[
    {
      "word":"hello",
      "user":["HH","AA","L","O"],
      "target":["HH","AH","L","OW"],
      "issue":"vowel_shift",
      "severity":"medium",
      "notes":"AA vs AH"
    }
  ]
}
```

**Verify:**

* Issues correspond to expected phoneme mismatches.
* Severity thresholds set sensibly.

**If failed:** inspect phoneme mapping format (ARPAbet vs IPA); convert consistently.

---

### Step 5 — Pre-LLM Feature Extraction (stress/rhythm/scoring)

**Purpose:** Aggregate stress detection, schwa detection, rhythm metrics and prepare structured input for LLM.

**Before you call:**

* Implement rules to detect:

  * primary/secondary stress mismatch (compare target stress markers)
  * missing schwa (unstressed syllable not reduced)
  * rhythm metrics (syllable durations, variance)
* Produce JSON schema expected by LLM prompt templates (see `/prompts`).

**Example object to produce for LLM:**

```json
{
 "transcript":"hello world",
 "alignment":[...],
 "user_phonemes":{...},
 "target_phonemes":{...},
 "phoneme_diff":[...],
 "stress_data":{ "word_level":[...], "sentence_rhythm": {...} }
}
```

**Verify:**

* Schema matches LLM service expectation (keys and types).
* Timestamps preserved.

---

### Step 6 — TTS Service (XTTS / Coqui)

**Purpose:** Generate American-accent audio from transcript.

**Before you call:**

* TTS model downloaded & loaded (GPU recommended).
* Service must write output to MinIO/S3 or local artifact path accessible via URL.

**Example request:**

```bash
curl -X POST "http://localhost:8005/tts/process" \
  -H "Content-Type: application/json" \
  -d '{"text":"hello world","voice":"us_female_1"}'
```

**Example response:**

```json
{"tts_url":"http://minio:9000/audio/hello-world-tts.wav"}
```

**Verify:**

* TTS audio is intelligible and accent is US style.
* File saved to MinIO and accessible via returned URL.

---

### Step 7 — Voice Conversion Service (RVC) *optional*

**Purpose:** Convert TTS output into the user’s own voice (few-shot).

**Before you call:**

* User voice samples available (upload or previously stored).
* RVC training flow implemented (few-shot model build) and cached.

**Example request:**

```bash
curl -X POST "http://localhost:8006/vc/process" \
  -H "Content-Type: application/json" \
  -d '{
    "tts_url":"http://minio:9000/audio/hello-world-tts.wav",
    "user_voice_samples":["http://minio:9000/audio/user_sample1.wav"]
  }'
```

**Example response:**

```json
{"converted_url":"http://minio:9000/audio/hello-world-uservc.wav"}
```

**Verify:**

* Converted audio preserves user identity (subjective) and has US accent.
* If VC fails, service should return fallback flag and `tts_url`.

**If failed:** check GPU memory, model convergence logs, sample quality.

---

### Step 8 — Feedback LLM Service

**Purpose:** Use LLM prompt templates to convert structured analysis into human-style feedback, drills, and explanations.

**Before you call:**

* Prompt templates loaded from `prompts/`.
* LLM API key configured (OpenAI/Gemini/local model).
* Guardrails applied (no hallucination; only use provided data).

**Example request:**

```bash
curl -X POST "http://localhost:8007/feedback/process" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript":"hello world",
    "alignment":[...],
    "user_phonemes":{...},
    "target_phonemes":{...},
    "phoneme_diff":[...],
    "stress_data":{...}
  }'
```

**Example response (structured JSON):**

```json
{
  "overall_summary":"Good clarity; vowel in 'hello' needs adjustment.",
  "issues":[
    {
      "word":"hello",
      "user_pronunciation":"HH AA L O",
      "target_pronunciation":"HH AH L OW",
      "issue_type":"vowel_shift",
      "explanation":"Your 'AH' sounded like 'AA'...",
      "fix_instructions":"Relax jaw; practice 'hut' vs 'hot'.",
      "audio_timestamps":{"start":0.12,"end":0.45},
      "severity":"medium"
    }
  ],
  "drills":{"minimal_pairs":["ship–sheep"], ...}
}
```

**Verify:**

* JSON matches schema in `openapi.yaml`.
* No hallucinated timestamps or phonemes.
* LLM output concise and actionable.

**If failed:** check prompt content, LLM provider rate limits, and ensure all required fields present.

---

### Step 9 — Orchestrator End-to-End (full pipeline)

**Purpose:** Glue all the above services in sequence and return the aggregated final result.

**Before you call:**

* All microservices running and reachable via internal network names (as in `docker-compose`).
* Orchestrator configured with service URLs (env vars).
* Redis configured for job queue (if orchestrator uses async workers).

**Example request (upload audio or provide MinIO URL):**

```bash
curl -X POST "http://localhost:8010/orchestrator/process-all" \
  -F "file=@./tests/audio/hello-world.wav"
```

or

```bash
curl -X POST "http://localhost:8010/orchestrator/process-all" \
  -H "Content-Type: application/json" \
  -d '{"audio_url":"http://minio:9000/audio/hello-world.wav"}'
```

**Expected aggregated final JSON (short):**

```json
{
  "transcript":"hello world",
  "alignment":[...],
  "phonemes":{...},
  "tts_url":"http://minio:9000/audio/hello-world-tts.wav",
  "voice_converted_url":"http://minio:9000/audio/hello-world-uservc.wav",
  "feedback":{...}
}
```

**Verify:**

* All keys present.
* TTS and converted audio URLs valid.
* Feedback quality acceptable.
* Store final result in Postgres via Node/Orchestrator if required.

**If failed:** check each microservice logs to identify failing stage; orchestrator should emit stage-by-stage logs.

---

## Post-processing / UI Integration

* Provide `taskId` on upload; orchestrator returns `task_id` and status updates.
* Frontend polls `GET /api/task/:taskId/status` (NodeJS API) which proxies to orchestrator or reads DB.
* On completion front-end retrieves final JSON and audio URLs to display.

---

## Testing & Mock Mode

* Use `MOCK_MODE=true` env to have services return canned JSON (`tests/data/*.json`) for faster iterative development and UI integration.
* Unit tests: `pytest` run against each service.
* Integration tests: `test_orchestrator.py` uses `tests/audio/hello-world.wav` and expects `mock_orchestrator_full.json` shape.

---

## Troubleshooting tips

* **No transcript / gibberish:** re-encode audio to WAV mono 16k with `ffmpeg -i in.mp3 -ar 16000 -ac 1 out.wav`.
* **Alignment poor:** verify transcript closely matches audio; ASR errors propagate.
* **LLM hallucinations:** ensure prompt guardrails; send only required fields; enable a defensive `max_tokens` and temperature=0.0 for structured output.
* **GPU OOMs:** reduce batch size, use FP16, or use smaller model variant.
* **MinIO access errors:** ensure `MINIO_ENDPOINT` and credentials in `.env` and same network in docker-compose.
* **Service not reachable:** use `docker-compose ps` to check container names/ports and test internal name resolution e.g. `curl http://asr-service:8000/asr/health` from orchestrator container.

---

## Acceptance checklist (developer signs off)

* [ ] All services `health` endpoints return `ok`.
* [ ] ASR returns correct transcript & word timestamps for test audio.
* [ ] Alignment returns phoneme timestamps consistent with words.
* [ ] Phoneme map returns target phonemes for test words.
* [ ] Phoneme diff returns meaningful issue(s) for mismatches.
* [ ] TTS produces US-accent audio and stored in MinIO.
* [ ] Voice conversion produces converted URL or proper fallback.
* [ ] Feedback LLM returns structured JSON per prompt schema.
* [ ] Orchestrator chains services, returns final aggregated JSON.
* [ ] Frontend displays results correctly when polled.
* [ ] Tests (unit + integration mock) pass.

---

## Quick command cheat-sheet

* Start services:

  ```bash
  docker-compose up -d --build
  ```
* Check logs (single service):

  ```bash
  docker-compose logs -f asr-service
  ```
* Test an endpoint:

  ```bash
  curl -F "file=@tests/audio/hello-world.wav" http://localhost:8001/asr/process
  ```
* Run tests (inside a service container or local env):

  ```bash
  pytest tests/ -q
  ```
