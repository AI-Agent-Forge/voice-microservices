# **TECHNICAL SPECIFICATION DOCUMENT — AgentForge Voice Processing System (MVP)**

### *Version 1.0 — For Backend Developers & Interns*

---

## **1. Overview**

The AgentForge Voice Processing System is a distributed collection of FastAPI microservices that work together to analyze user speech, detect pronunciation deviations, and generate US-accent training feedback.

The system performs:

* Automatic Speech Recognition (ASR)
* Phoneme alignment
* Phoneme extraction
* Target phoneme mapping (CMUdict)
* Phoneme mismatch detection
* Speech synthesis (TTS)
* Voice conversion (VC)
* LLM-based structured feedback

All components are orchestrated by a central **Orchestrator Service**.

---

# **2. High-Level Architecture**

The voice pipeline consists of:

* **NodeJS API Gateway** (handles audio upload & task creation)
* **Orchestrator** (pipeline manager)
* **7 FastAPI microservices**
* **MinIO/S3** (artifact storage)
* **Redis** (queue)
* **Postgres** (metadata, task tracking)

---

# **3. Internal Microservices Architecture (Developer View)**

### 📘 *Diagram: Microservices Only*

```mermaid
flowchart TB
  subgraph MICROS["AgentForge Voice Microservices (Internal Architecture)"]
    direction TB

    ASR["ASR Service<br/>WhisperX (GPU)<br/><sub>
      POST /asr/process<br/>
      GET /asr/health
    </sub>"]

    ALIGN["Alignment Service<br/>MFA / WhisperX Align<br/><sub>
      POST /alignment/process<br/>
      GET /alignment/health
    </sub>"]

    PMAP["Phoneme Map Service<br/>CMUdict Lookup<br/><sub>
      POST /phoneme-map/process<br/>
      GET /phoneme-map/health
    </sub>"]

    DIFF["Phoneme Diff Engine<br/>Rule-based comparer<br/><sub>
      POST /diff/process<br/>
      GET /diff/health
    </sub>"]

    TTS["Txt2Speech Service<br/>XTTS / Coqui (GPU)<br/><sub>
      POST /tts/process<br/>
      GET /tts/health
    </sub>"]

    VC["Voice Conversion Service<br/>RVC (GPU)<br/><sub>
      POST /vc/process<br/>
      GET /vc/health
    </sub>"]

    LLM["Feedback LLM Service<br/>Structured JSON Output<br/><sub>
      POST /feedback/process<br/>
      GET /feedback/health
    </sub>"]
  end

  %% Internal data flow
  ASR --> ALIGN
  ALIGN --> PMAP
  PMAP --> DIFF
  DIFF --> LLM
  TTS --> VC
  TTS --> LLM
  VC --> LLM

  classDef gpu fill:#ffe6e6,stroke:#ff5c5c;
  class ASR,TTS,VC gpu;

  style MICROS fill:#f7faff,stroke:#aac7ff,stroke-width:2px;
```

---

# **4. Orchestrator Internal Flow (Step-by-Step)**

### 📘 *Diagram: Orchestrator Sequence (Developer-Focused)*

```mermaid
sequenceDiagram
  autonumber
  participant ORCH as Orchestrator
  participant ASR as ASR Service
  participant ALIGN as Alignment Service
  participant PMAP as Phoneme Map
  participant DIFF as Phoneme Diff
  participant TTS as TTS Engine
  participant VC as Voice Conversion
  participant LLM as Feedback LLM

  Note over ORCH: Step 1: Receive audio_url or uploaded file
  ORCH->>ASR: POST /asr/process {audio_url}
  ASR-->>ORCH: transcript + word timestamps

  Note over ORCH: Step 2: Phoneme Alignment
  ORCH->>ALIGN: POST /alignment/process {audio_url, transcript}
  ALIGN-->>ORCH: phoneme timestamps

  Note over ORCH: Step 3: Target Phoneme Lookup
  ORCH->>PMAP: POST /phoneme-map/process {words}
  PMAP-->>ORCH: target phonemes (CMUdict)

  Note over ORCH: Step 4: Compare User vs Target
  ORCH->>DIFF: POST /diff/process {user_phonemes, target_phonemes}
  DIFF-->>ORCH: mismatch details + severity

  Note over ORCH: Step 5: Build Stress/Schwa/Rhythm Data
  ORCH->>ORCH: preprocess for LLM

  Note over ORCH: Step 6: Generate US Accent Audio
  ORCH->>TTS: POST /tts/process {transcript}
  TTS-->>ORCH: tts_url

  Note over ORCH: Step 7: Voice Conversion (optional)
  ORCH->>VC: POST /vc/process {tts_url, user_samples}
  VC-->>ORCH: converted_url

  Note over ORCH: Step 8: LLM Feedback
  ORCH->>LLM: POST /feedback/process {all structured inputs}
  LLM-->>ORCH: feedback JSON

  ORCH-->>ORCH: Combine all into final JSON response
```

---

# **5. Microservice Responsibilities (Detailed)**

### **ASR Service**

* Uses WhisperX (GPU)
* Outputs transcript + word-level timestamps
* Input: audio_url or file upload

### **Alignment Service**

* Produces phoneme timestamps
* Uses MFA or WhisperX alignment backend
* Requires transcript + audio

### **Phoneme Map Service**

* Maps target English phonemes via CMUdict
* Required for pronunciation comparison

### **Phoneme Diff Service**

* Compares user phonemes vs CMUdict target phonemes
* Detects vowel shifts, consonant errors, missing schwa
* Outputs severity-scored issues

### **TTS Service**

* Produces US-accent standard audio (WAV format, 24kHz)
* Uses Gemini TTS API (`gemini-2.5-flash-preview-tts`)
* Uploads generated audio to S3/MinIO

**Available Voices (30 options):**
| Voice | Voice | Voice | Voice | Voice |
|-------|-------|-------|-------|-------|
| Aoede | Charon | Fenrir | **Kore** (default) | Puck |
| Zephyr | Orus | Leda | Helios | Nova |
| Altair | Lyra | Orion | Vega | Clio |
| Dorus | Echo | Fable | Cove | Sky |
| Sage | Ember | Vale | Reef | Aria |
| Ivy | Stone | Quill | Drift | Briar |

**Supported Languages (24):** en-US, en-IN, de-DE, es-US, fr-FR, hi-IN, id-ID, it-IT, ja-JP, ko-KR, pt-BR, ru-RU, nl-NL, pl-PL, th-TH, tr-TR, vi-VN, ro-RO, uk-UA, bn-BD, mr-IN, ta-IN, te-IN, ar-EG

### **Voice Conversion Service**

* Converts TTS output into user's own voice style
* RVC-based (GPU)

### **LLM Feedback Service**

* Uses Gemini API (`gemini-2.0-flash` by default)
* Applies structured prompts
* Generates:

  * Summary
  * Pronunciation corrections
  * Minimal pair drills
  * Stress/schwa guidance
* Configurable via `GEMINI_API_KEY` and `GEMINI_MODEL` environment variables

---

# **6. Orchestrator Responsibilities**

The orchestrator is the “brain” that:

### ✔ Receives task

### ✔ Calls microservices sequentially

### ✔ Stores artifacts in MinIO

### ✔ Updates Postgres metadata

### ✔ Combines results into final JSON

### ✔ Returns structured output to Node backend

Orchestrator must handle:

* Retry logic
* Timeout handling
* File management
* Mock mode (`MOCK_MODE=true`)

---

# **7. Data Schemas**

### **ASR Output**

```json
{
  "transcript": "hello world",
  "words":[{"word":"hello","start":0.12,"end":0.45}]
}
```

### **Alignment Output**

```json
{"phonemes":[{"phoneme":"HH","start":0.12,"end":0.18}]}
```

### **Phoneme Map Output**

```json
{"map":{"hello":["HH","AH","L","OW"]}}
```

### **Diff Output**

```json
{
  "comparisons":[
    {
      "word":"hello",
      "issue":"vowel_shift",
      "severity":"medium"
    }
  ]
}
```

### **LLM Feedback Output**

```json
{
  "summary":"Your vowel in 'hello' is slightly off.",
  "issues":[...],
  "drills":[...]
}
```

---

# **8. Developer Setup**

### Local Setup

```bash
docker-compose up --build -d
```

### Test ASR

```bash
curl -F "file=@tests/audio/test.wav" http://localhost:8001/asr/process
```

### Run orchestrator end-to-end

```bash
curl -F "file=@tests/audio/test.wav" http://localhost:8010/orchestrator/process-all
```

---

# **9. Acceptance Checklist**

* [ ] All microservices respond to `/health`
* [ ] End-to-end pipeline runs with real audio
* [ ] TTS + voice conversion generated correctly
* [ ] LLM returns structured JSON feedback
* [ ] All artifacts stored in MinIO
* [ ] Task status updated in Postgres
* [ ] All docker services stable under load
* [ ] Mock mode tested for frontend development

---

# **10. Appendix**

### Related Docs (in repo):

* `FOLDER_STRUCTURE.md`
* `DOCKER_COMPOSE_SETUP.md`
* `PROMPT_TEMPLATES.md`
* `OPENAPI_SPECS/`
* `TEST_CASES/`

---
