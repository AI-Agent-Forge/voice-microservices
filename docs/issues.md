Below are **fully formatted GitHub Issues** for your **voice-microservices** repository (`agentforge-voice-microservices`).
You can **copy/paste each directly into GitHub** as issues.

This set includes **20 issues**, covering:

✔ Repo setup
✔ ASR service
✔ Alignment service
✔ Phoneme mapping
✔ Phoneme diff engine
✔ TTS
✔ Voice conversion
✔ LLM feedback
✔ Pipeline orchestrator
✔ Deployment + docs + testing

If you want more (infra, monitoring, scaling), just say **“Continue”**.

---

# ✅ **ISSUE 1 — Repository Initialization**

**Title:** Setup Repository Structure & Boilerplate Code
**Labels:** `infra`, `docs`, `priority/high`

---

### **Summary**

Initialize the `agentforge-voice-microservices` repository with folder structure, common configs, documentation, and dev environment setup.

---

### **Tasks**

* [ ] Create folder structure:

```
/asr-service
/alignment-service
/phoneme-map-service
/phoneme-diff-service
/tts-service
/voice-conversion-service
/feedback-llm-service
/pipeline-orchestrator
/shared
/docs
```

* [ ] Add root-level `README.md`
* [ ] Add `CONTRIBUTING.md`
* [ ] Add `docker-compose.yml` placeholder
* [ ] Add `.gitignore` (Python, Docker, temp files)
* [ ] Configure pre-commit hooks (black, isort, flake8)

---

### **Acceptance Criteria**

* Repo builds with no errors
* Developer can clone repo and run FastAPI boilerplate apps

---

---

# ✅ **ISSUE 2 — Create Shared Utilities Library**

**Title:** Create `/shared` Utility Library
**Labels:** `backend`, `infra`

---

### **Summary**

Build reusable utilities: file I/O, storage, logging, config loader, exception handler.

---

### **Tasks**

* [ ] Config loader (`pydantic-settings`)
* [ ] Logging setup (JSON logs)
* [ ] Storage client wrapper (MinIO/S3)
* [ ] Exception classes
* [ ] Helper: download audio from URL
* [ ] Shared models (`pydantic` schemas)

---

### **Acceptance Criteria**

* All other services can import shared utilities
* Proper logging for every microservice

---

---

# 🚀 ASR SERVICE TASKS

---

# ✅ **ISSUE 3 — ASR Service Skeleton (FastAPI)**

**Title:** ASR Service: FastAPI Skeleton
**Labels:** `backend`, `priority/high`

---

### **Summary**

Create `/asr-service` FastAPI app.

---

### **Tasks**

* [ ] Add FastAPI skeleton
* [ ] Add `/health` endpoint
* [ ] Add `/process` endpoint accepting audio file
* [ ] Add startup hook to load WhisperX model

---

### **Acceptance Criteria**

* Service runs locally and responds to `/health`

---

---

# ✅ **ISSUE 4 — WhisperX Integration (ASR)**

**Title:** ASR Service: Integrate WhisperX (Transcription + Word Timestamps)
**Labels:** `ml`, `backend`

---

### **Summary**

Add WhisperX inference with timestamps.

---

### **Tasks**

* [ ] Load WhisperX model once on startup
* [ ] Implement transcription
* [ ] Produce JSON output with:

  * transcript
  * word-level timestamps
  * language

---

### **Acceptance Criteria**

* Returns transcript + timestamps for test audio

---

---

# 🧩 ALIGNMENT SERVICE

---

# ✅ **ISSUE 5 — Alignment Service Skeleton**

**Title:** Alignment Service: FastAPI Skeleton
**Labels:** `backend`

---

### **Tasks**

* [ ] Create `/alignment-service` FastAPI project
* [ ] `/health` endpoint
* [ ] `/process` → receives audio URL + transcript

---

### **Acceptance Criteria**

* Service skeleton works

---

---

# ✅ **ISSUE 6 — Forced Alignment Integration (MFA or WhisperX)**

**Title:** Alignment Service: Implement Forced Alignment
**Labels:** `ml`, `priority/high`

---

### **Tasks**

* [ ] Use WhisperX alignment OR MFA
* [ ] Produce phoneme timings
* [ ] Validate accuracy on sample clips

---

### **Acceptance Criteria**

* Returns phoneme timeline as JSON
* Matches expected timing patterns

---

---

# 🔤 PHONEME MAPPING SERVICE

---

# ✅ **ISSUE 7 — Phoneme Map Service Skeleton**

**Title:** Phoneme Mapping Service: FastAPI App Setup
**Labels:** `backend`

---

### **Tasks**

* [ ] Create FastAPI skeleton
* [ ] Add endpoint `/process` to map words → phonemes

---

### **Acceptance Criteria**

* Responds to simple word list

---

---

# ✅ **ISSUE 8 — CMUdict Integration**

**Title:** Load CMUdict & Implement Word → Phoneme Mapping
**Labels:** `ml`

---

### **Tasks**

* [ ] Load CMUdict into memory on startup
* [ ] Provide mapping for common English words
* [ ] Provide fallback heuristic for OOV
* [ ] Add tests

---

### **Acceptance Criteria**

* Returns phonemes for 90%+ of words in sample sentences

---

---

# 🔍 PHONEME DIFF SERVICE

---

# ✅ **ISSUE 9 — Diff Service Skeleton**

**Title:** Phoneme Diff Service: FastAPI Setup
**Labels:** `backend`

---

### **Tasks**

* [ ] Create skeleton app
* [ ] Add `/process` endpoint receiving user + target phonemes

---

---

# ✅ **ISSUE 10 — Implement Phoneme Diff Algorithm**

**Title:** Implement Phoneme Diff Engine (Indian → US Accent Rules)
**Labels:** `ml`, `priority/high`

---

### **Tasks**

* [ ] Implement algorithm to compare sequences
* [ ] Add rules for:

  * Vowel shifts
  * Retroflex consonants
  * Hard T vs flap
  * Missing schwa
  * Stress errors
* [ ] Produce structured diff JSON

---

### **Acceptance Criteria**

* Identifies known pronunciation issues correctly

---

---

# 🎙️ TTS SERVICE

---

# ✅ **ISSUE 11 — TTS Service Skeleton**

**Title:** TTS Service: FastAPI Setup
**Labels:** `backend`

---

### **Tasks**

* [ ] Create FastAPI project
* [ ] Add `/process` endpoint receiving text + voice id

---

---

# ✅ **ISSUE 12 — Integrate XTTS / Coqui TTS**

**Title:** Implement US Accent TTS (XTTS / Coqui)**
**Labels:** `ml`, `priority/high`

---

### **Tasks**

* [ ] Load XTTS model
* [ ] Convert text → WAV
* [ ] Upload to MinIO
* [ ] Return `tts_url`

---

### **Acceptance Criteria**

* Clear US-accent audio generated

---

---

# 🗣️ VOICE CONVERSION SERVICE

---

# ✅ **ISSUE 13 — Voice Conversion Service Skeleton**

**Title:** Voice Conversion: Setup FastAPI App
**Labels:** `backend`

---

---

# ✅ **ISSUE 14 — RVC Integration (Few-Shot User Voice Conversion)**

**Title:** Integrate RVC Voice Conversion Pipeline
**Labels:** `ml`, `priority/high`

---

### **Tasks**

* [ ] Setup RVC / so-vits-svc
* [ ] Download user training samples
* [ ] Train user voice model
* [ ] Convert TTS output → user voice
* [ ] Upload to MinIO

---

### **Acceptance Criteria**

* Converted voice resembles user
* Fallback path works

---

---

# 💬 LLM FEEDBACK SERVICE

---

# ✅ **ISSUE 15 — LLM Feedback Service Skeleton**

**Title:** Feedback LLM Service: FastAPI Setup
**Labels:** `backend`

---

---

# ✅ **ISSUE 16 — Implement Feedback Generator Using LLM API**

**Title:** Implement Pronunciation Feedback Generator
**Labels:** `ml`, `backend`

---

### **Tasks**

* [ ] Create prompt templates
* [ ] Accept phoneme diff + transcript
* [ ] Generate structured JSON feedback
* [ ] Add OpenAI/Gemini config

---

### **Acceptance Criteria**

* Feedback JSON includes summary + drills + per-word corrections

---

---

# 🔗 PIPELINE ORCHESTRATOR SERVICE

---

# ✅ **ISSUE 17 — Orchestrator Service Skeleton**

**Title:** Pipeline Orchestrator: Setup FastAPI App
**Labels:** `backend`

---

### **Tasks**

* [ ] Create `/orchestrator` service
* [ ] Add `/process-all` endpoint

---

---

# ✅ **ISSUE 18 — Implement End-to-End Pipeline Logic**

**Title:** Orchestrator: Chain ASR → Alignment → Mapping → Diff → TTS → VC → Feedback
**Labels:** `backend`, `priority/high`

---

### **Tasks**

* [ ] Implement async pipeline execution
* [ ] Error recovery at each stage
* [ ] Store artifacts in MinIO
* [ ] Combine everything into final JSON payload

---

### **Acceptance Criteria**

* Passing complete sample audio returns all results
* All services are called sequentially

---

---

# 🧪 TESTING & DOCS

---

# ✅ **ISSUE 19 — Add Unit Tests + Sample Audio**

**Title:** Testing: Add Unit & Integration Tests + Sample Audio
**Labels:** `test`

---

### **Tasks**

* [ ] Add test audio files
* [ ] Write tests for all services
* [ ] Write orchestrator E2E tests

---

### **Acceptance Criteria**

* `pytest` suite passes
* CI pipeline green

---

---

# 📚 DOCUMENTATION

---

# ✅ **ISSUE 20 — Documentation & API Spec**

**Title:** Create API Documentation (OpenAPI) for All Services
**Labels:** `docs`, `priority/medium`

---

### **Tasks**

* [ ] Add OpenAPI schemas for all microservices
* [ ] Add README for each service
* [ ] Add diagrams of pipeline
* [ ] Add sample requests/responses

---

### **Acceptance Criteria**

* Developer can follow docs and run entire voice pipeline locally

