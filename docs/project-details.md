# ✅ **AgentForge — Voice Microservices (Backend Engineer Specification)**

**Project:** Voice Accent Coaching Agent
**Role:** Backend Engineer (Python, FastAPI, ML Pipelines)
**Repo:** `agentforge-voice-microservices`

---

# **1. Goal**

Build a collection of **Python FastAPI microservices** that process user's speech for the following tasks:

1. **ASR (WhisperX)** → transcript + timestamps
2. **Forced Alignment (MFA or WhisperX)** → phoneme timings
3. **Phoneme Mapping (CMUdict)** → canonical US accent
4. **Phoneme Diff Engine** → detect pronunciation errors
5. **US-Accent TTS (XTTS/Coqui)** → corrected accent output
6. **Voice Conversion (RVC)** → corrected accent but in user's voice
7. **LLM Feedback Service** → drills + instructions
8. **Pipeline Orchestrator** → ties all steps together

Later, Node.js backend will call each service individually.

---

# **2. Overall Architecture**

The repo will contain **independent microservices**, each deployable via Docker:

```
agentforge-voice-microservices/
 ├── asr-service/
 ├── alignment-service/
 ├── phoneme-map-service/
 ├── phoneme-diff-service/
 ├── tts-service/
 ├── voice-conversion-service/
 ├── feedback-llm-service/
 ├── pipeline-orchestrator/
 ├── shared/
 ├── docker-compose.yml
 └── docs/
```

Each microservice must:

* Be a standalone **FastAPI** app
* Accept JSON or multipart-form inputs
* Return strict JSON responses
* Log timing + errors
* Use async where possible
* Run inside Docker
* Expose `/health` endpoint

---

# **3. Technology Requirements**

### **3.1 Languages & Frameworks**

* Python 3.10+
* FastAPI (mandatory)
* Uvicorn (ASGI server)

### **3.2 ML libraries**

* WhisperX
* PyTorch
* Montreal Forced Aligner (MFA) OR WhisperX alignment
* Coqui TTS or XTTS
* RVC (so-vits-svc or RVC v2)
* CMU Pronouncing Dictionary
* NumPy, Librosa, Soundfile

### **3.3 Infra**

* Docker
* Redis (for pipeline orchestration)
* MinIO/S3 client (for storing audio)
* Logging (structlog / python-json-logger)

---

# **4. Microservice Deliverables (Detailed)**

---

# **4.1 ASR Service — `/asr`**

### **Input**

Audio file (`wav/mp3/m4a`) via multipart-form.

### **Output**

```json
{
  "transcript": "Hello this is a test",
  "words": [
    { "word": "Hello", "start": 0.10, "end": 0.47 },
    { "word": "this", "start": 0.50, "end": 0.68 }
  ],
  "language": "en"
}
```

### **Requirements**

* Use WhisperX (not standard Whisper)
* GPU-accelerated support
* Fallback to CPU if GPU unavailable
* Detect language
* Cache model in memory

---

# **4.2 Alignment Service — `/align`**

### **Input**

```json
{
  "audio_url": "https://.../audio.wav",
  "transcript": "Hello this is a test"
}
```

### **Output**

```json
{
  "phonemes": [
    { "phoneme": "HH", "start": 0.10, "end": 0.20 },
    { "phoneme": "AH", "start": 0.20, "end": 0.35 }
  ]
}
```

### **Requirements**

* Use MFA (preferred) or WhisperX alignment
* Ensure phoneme segmentation is accurate
* Store alignment artifacts in storage

---

# **4.3 Phoneme Mapping Service — `/map-phonemes`**

### **Input**

```json
{
  "words": ["hello", "this", "test"]
}
```

### **Output**

```json
{
  "map": {
    "hello": ["HH", "AH", "L", "OW"],
    "this": ["DH", "IH", "S"]
  }
}
```

### **Requirements**

* Load CMUdict (US General American accent)
* Provide fallback for OOV words
* Provide IPA conversion helper

---

# **4.4 Phoneme Diff Service — `/compare`**

### **Input**

```json
{
  "user_phonemes": [...],
  "target_phonemes": [...]
}
```

### **Output**

```json
{
  "comparisons": [
    {
      "word": "this",
      "user": ["dh", "is"],
      "target": ["dh", "ih", "s"],
      "issue": "vowel shift /is/ → /ih/",
      "severity": "medium"
    }
  ]
}
```

### **Requirements**

Implement rule-based classifier for Indian → US:

* Vowel shifts (`æ → aː`, `ɪ → iː`)
* Retroflex consonants
* Hard "T" vs flap "T"
* Missing schwa
* Stress errors

---

# **4.5 TTS Service — `/tts`**

### **Input**

```json
{
  "text": "The quick brown fox jumps",
  "voice": "us_female_1"
}
```

### **Output**

```json
{
  "tts_url": "https://..../tts.wav"
}
```

### **Requirements**

* Use **XTTS / Coqui** for US-accent TTS
* Must be clear, consistent, studio-quality
* Save output to MinIO/S3
* Multi-speaker support

---

# **4.6 Voice Conversion Service — `/voice-convert`**

### **Input**

```json
{
  "tts_url": "https://.../tts.wav",
  "user_voice_samples": ["https://.../sample1.wav"]
}
```

### **Output**

```json
{
  "converted_url": "https://.../converted.wav"
}
```

### **Requirements**

* Use **RVC / so-vits-svc**
* Few-shot voice training (< 5 minutes of speech)
* Train lightweight model per user
* Cache model for reuse
* If VC training fails → fallback to TTS-only

---

# **4.7 LLM Feedback Service — `/feedback`**

### **Input**

```json
{
  "transcript": "...",
  "phoneme_diff": [...],
  "alignment": [...]
}
```

### **Output**

```json
{
  "summary": "Good rhythm, improve vowel clarity",
  "drills": ["ship vs sheep", "bit vs beat"],
  "word_feedback": [
    {
      "word": "weather",
      "issue": "Soft th missing",
      "instructions": "Place tongue between teeth..."
    }
  ]
}
```

### **Requirements**

* Use OpenAI / Gemini / local LLaMA (configurable)
* Prompt templates must be created clearly
* Return structured JSON
* Must not hallucinate missing timestamps

---

# **4.8 Pipeline Orchestrator (Optional for MVP)**

This service accepts one request and runs ALL microservices sequentially.

### **Input**

* audio file or URL

### **Output**

* transcript
* phonemes
* US accent audio
* converted user voice
* feedback
* everything aggregated

---

# **5. Input/Output Contract (Required for All Services)**

### Every service must have:

`POST /process`

* Standard request structure
* Standard error structure
* Health endpoint `/health` returning `{ "status": "ok" }`
* Logging: request time, duration, GPU/CPU usage

### Standard Error Response

```json
{
  "error": true,
  "message": "ASR model not loaded",
  "details": "stacktrace or debug info"
}
```

---

# **6. Developer Tasks (Weekly Breakdown)**

### **Week 1 — Repo Setup**

* Setup FastAPI template
* Setup Dockerfile for all services
* Setup shared utilities
* Setup logging structure
* Setup MinIO client
* Setup configuration loader

---

### **Week 2 — ASR + Alignment**

* Implement ASR
* Implement forced alignment
* Upload sample audio
* Store outputs
* Add unit tests

---

### **Week 3 — Phoneme Mapping + Diff Engine**

* Load CMUdict
* Word → phoneme mapping
* Build diff rules
* Test with Indian accent samples

---

### **Week 4 — TTS Integration**

* Integrate XTTS
* Add multi-voice support
* Optimize latency
* Add GPU & CPU fallback

---

### **Week 5 — Voice Conversion**

* Implement RVC
* Build user voice creation pipeline
* Test stable conversion
* Add fallback

---

### **Week 6 — LLM Feedback**

* Build prompt templates
* LLM API integration
* Structured JSON generation
* Add rate-limiting + retries

---

# **7. What This Backend Engineer Should Deliver**

### **Working microservices:**

* [ ] ASR
* [ ] Alignment
* [ ] Phoneme mapping
* [ ] Phoneme diff
* [ ] TTS
* [ ] Voice conversion
* [ ] LLM feedback
* [ ] (Optional) Pipeline orchestrator

### **Documentation:**

* [ ] README with full setup
* [ ] API specification for each service
* [ ] Sample requests & responses
* [ ] Docker Compose for running locally

### **Tests:**

* [ ] Unit tests
* [ ] E2E tests with sample audio

---

# **8. Dependencies & Integration Notes**

The **Node.js backend** will call these microservices like this:

```
Node Express API → FastAPI microservice → returns JSON → Node stores in DB → React UI displays results
```

The engineer must ensure:

* All endpoints are **pure REST**
* No UI inside microservices
* No DB inside Python services (stateless)
* All audio files stored via MinIO/S3

---

# **9. Environment Requirements**

Minimum local dev machine:

* 16GB RAM
* Python 3.10
* CUDA 11.8 (if GPU available)
* Docker installed

FastAPI services must optionally run on:

* Cloud GPU (NVIDIA T4 / L4 / A10 / A100)
* Cloud CPU (fallback)

---

# **10. Final Notes for the Engineer**

* Write maintainable, modular code
* Each service must run independently
* Think production-ready from Day 1
* Keep services small, focused, minimal
* Take inspiration from Netflix microservices patterns
* Implement clear logging & monitoring hooks
