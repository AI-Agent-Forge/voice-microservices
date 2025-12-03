Below is a **step-by-step, production-ready execution plan** for your **Backend Engineer**, covering everything needed to build the entire *voice-microservices system* in the correct order.

This includes:

✔ folder structure
✔ docker + gpu builds
✔ microservice setup order
✔ prompt templates
✔ mock mode
✔ tests
✔ audio samples
✔ CI/CD

Everything is structured as a **clear execution checklist**, so your engineer can follow this from Day 1 to completion.

---

# ✅ **PHASE 0 — Project Setup**

### **Step 0.1 — Create Mono-Repo**

Create root folder:

```
voice-microservices/
```

Inside it:

```
/voice-microservices
│
├── asr-service/
├── alignment-service/
├── phoneme-map-service/
├── phoneme-diff-service/
├── tts-service/
├── voice-conversion-service/
├── feedback-llm-service/
├── orchestrator-service/
│
├── prompts/
├── tests/
├── docker/
├── docs/
├── docker-compose.yml
└── README.md
```

---

# ✅ **PHASE 1 — Immediate Setup (Day 1–2)**

### **Step 1.1 — Initialize All Microservice Folders**

For each service, create identical structure:

```
/xxx-service
│
├── app/
│   ├── main.py
│   ├── routers/
│   ├── services/
│   ├── utils/
│   ├── __init__.py
│
├── requirements.txt
├── Dockerfile
├── README.md
└── openapi.yaml
```

Services:

1. asr-service
2. alignment-service
3. phoneme-map-service
4. phoneme-diff-service
5. tts-service
6. voice-conversion-service
7. feedback-llm-service
8. orchestrator-service

---

# ✅ **PHASE 2 — Docker + GPU Setup (Day 3)**

### **Step 2.1 — Add GPU Dockerfiles**

Paste the GPU-enabled Dockerfiles I gave you earlier:

* WhisperX (asr-service)
* MFA / Montreal Forced Aligner (alignment-service)
* CMUdict phoneme map service
* TTS (XTTS)
* Voice Conversion (RVC)
* LLM feedback
* Orchestrator

### **Step 2.2 — Install NVIDIA Container Toolkit**

Engineer must ensure on host:

```bash
sudo nvidia-ctk runtime configure
sudo systemctl restart docker
```

---

# ✅ **PHASE 3 — docker-compose.yml (Day 4)**

Create root-level file:

```
docker-compose.yml
```

Include:

* each microservice
* GPU constraints for ASR/TTS/VC
* networks
* env vars (MOCK mode etc)

Example:

```yaml
version: "3.9"

services:
  asr-service:
    build: ./asr-service
    ports: ["8001:8000"]
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  tts-service:
    build: ./tts-service
    ports: ["8002:8000"]
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  voice-conversion-service:
    build: ./voice-conversion-service
    ports: ["8003:8000"]
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  feedback-llm-service:
    build: ./feedback-llm-service
    ports: ["8004:8000"]

  orchestrator-service:
    build: ./orchestrator-service
    ports: ["9000:9000"]
```

---

# ✅ **PHASE 4 — Prompts Setup (Day 5)**

Create folder:

```
/prompts
```

Add:

```
prompts/
│
├── system_stress.txt
├── stress_detection_prompt.txt
├── stress_word_prompt.txt
├── stress_schwa_prompt.txt
├── sentence_stress_prompt.txt
├── unified_stress_prompt.txt
└── llm_feedback_base.txt
```

Paste all the prompt templates provided earlier.

Engineer must add loader:

`feedback-llm-service/app/utils/prompt_loader.py`

```python
def load_prompt(name: str) -> str:
    with open(f"prompts/{name}", "r") as f:
        return f.read()
```

---

# ✅ **PHASE 5 — Implement Each Microservice (Day 6–14)**

Order of development matters.

---

## **Step 5.1 — ASR Service (WhisperX)**

Endpoints:

```
POST /process
GET /health
```

Tasks:

* load WhisperX model
* accept audio
* return transcript + word timestamps
* implement MOCK_MODE=True for fast local tests

---

## **Step 5.2 — Alignment Service**

Inputs:

* transcript
* audio_url

Outputs:

* phoneme timestamps

Tasks:

* integrate MFA or wav2vec aligner
* mock alignment JSON for tests

---

## **Step 5.3 — Phoneme Map (CMUdict)**

Tasks:

* load CMUdict
* search phoneme patterns
* return phoneme list per word

---

## **Step 5.4 — Phoneme Diff Service**

Tasks:

* compare user vs target phonemes
* mark wrong stress vowels
* return severity levels

---

## **Step 5.5 — TTS Service (XTTS)**

Tasks:

* load TTS model
* serve audio file URL

---

## **Step 5.6 — Voice Conversion (RVC)**

Tasks:

* convert TTS output → user’s voice
* return MP3 or WAV

---

## **Step 5.7 — LLM Feedback Service**

Tasks:

* load prompts
* call OpenAI / Gemini model
* return final JSON

---

## **Step 5.8 — Orchestrator Service (Final)**

This service **calls all others**:

1. ASR
2. Alignment
3. Phoneme Map
4. Phoneme Diff
5. TTS
6. Voice Conversion
7. LLM Feedback

Tasks:

* handle failures
* return unified JSON response
* optional: parallel calls

---

# ✅ **PHASE 6 — Test Infrastructure (Day 15–17)**

Create folder:

```
tests/
│
├── audio/
│   ├── hello-world.wav
│   ├── indian-accent-short.wav
│   ├── sentence-natural.wav
│   └── noise-test.wav
│
└── data/
    ├── mock_asr.json
    ├── mock_alignment.json
    ├── mock_phoneme_map.json
    ├── mock_phoneme_diff.json
    ├── mock_tts.json
    ├── mock_voice_conversion.json
    ├── mock_feedback.json
    └── mock_orchestrator_full.json
```

### Add basic tests:

```
test_asr.py
test_alignment.py
test_phoneme_map.py
test_phoneme_diff.py
test_tts.py
test_voice_conversion.py
test_feedback_llm.py
test_orchestrator.py
```

---

# ✅ **PHASE 7 — Mock Mode Implementation (Day 18–19)**

Add env var loader in each service:

```
MOCK_MODE=true
```

If true → return mock JSON from `tests/data/*.json`.

---

# ✅ **PHASE 8 — CI/CD (Day 20)**

### Add GitHub Actions:

```
.github/workflows/
│
├── build.yml
└── tests.yml
```

Each must:

* build Dockerfiles
* run unit tests
* run integration tests (mock mode)
* lint python code
* validate OpenAPI files

---

# ⭐ **BACKEND ENGINEER EXECUTION CHECKLIST**

### Week 1

✔ Create mono-repo
✔ Create folder structure
✔ Add docker-compose
✔ Create GPU Dockerfiles
✔ Add prompts folder
✔ Setup ASR, Alignment microservices (mock mode)

### Week 2

✔ Implement Phoneme Map
✔ Implement Diff
✔ Implement TTS
✔ Implement Voice Conversion

### Week 3

✔ Implement LLM Feedback
✔ Implement Orchestrator
✔ Add tests
✔ Add CI

---

# 🎉 Done

If you want, I can also create:

### ✔ Task breakdown into GitHub Issues

### ✔ Timeline + sprint plan for interns

### ✔ A Trello / Notion / Jira project board

### ✔ Architecture diagram

Just tell me **“Generate GitHub issues”** or **“Generate architecture diagram.”**
