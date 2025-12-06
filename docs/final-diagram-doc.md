### 1) Architecture Flowchart (Mermaid)

```mermaid
flowchart LR
  %% === USER / FRONTEND ===
  subgraph USER_SIDE["User & UI"]
    direction TB
    Browser[Browser / React UI]
    Browser -->|Upload/Record audio WAV| API_GW["NodeJS API Gateway<br/>(Express + Drizzle)"]
  end

  %% === API & ORCHESTRATOR ===
  subgraph BACKEND["Backend"]
    direction LR
    API_GW -->|POST /api/audio/upload - save to MinIO| MINIO[MinIO / S3 bucket: audio/]
    API_GW -->|Create task, POST /orchestrator/process-all| ORCH["Orchestrator Service<br/>(FastAPI)"]
  end

  %% === WORKER & QUEUE ===
  subgraph QUEUE["Queue & Cache"]
    REDIS[Redis / Celery / RQ]
    ORCH -->|enqueue job| REDIS
  end

  %% === MICRO-SERVICES (FastAPI) ===
  subgraph MICROS["Microservices (FastAPI)"]
    direction TB
    ASR[ASR Service<br/>WhisperX - GPU<br/>POST /asr/process]
    ALIGN[Alignment Service<br/>MFA / WhisperX align<br/>POST /alignment/process]
    PMAP[Phoneme Map Service<br/>CMUdict<br/>POST /phoneme-map/process]
    DIFF[Phoneme Diff Service<br/>rules engine<br/>POST /diff/process]
    TTS[TTS Service<br/>XTTS / Coqui - GPU<br/>POST /tts/process]
    VC["Voice Conversion (RVC) - GPU<br/>POST /vc/process"]
    LLM[Feedback LLM Service<br/>OpenAI / Gemini / local<br/>POST /feedback/process]
  end

  %% === STORAGE & DB ===
  subgraph STORAGE["Storage & DB"]
    MINIO_ART["minio:s3 (audio, models, artifacts)"]
    PG["Postgres (task metadata)"]
  end

  %% === INFRA ===
  subgraph INFRA["Infra & Observability"]
    direction TB
    K8S[Kubernetes / GKE / EKS]
    MON[Prometheus + Grafana]
    LOGS[ELK / CloudWatch]
    SECRETS[Secrets Manager / Vault]
  end

  %% === RELATIONSHIPS ===
  ORCH -->|calls| ASR
  ORCH -->|calls| ALIGN
  ORCH -->|calls| PMAP
  ORCH -->|calls| DIFF
  ORCH -->|calls| TTS
  ORCH -->|calls| VC
  ORCH -->|calls| LLM

  ASR -->|store transcript/artifact| MINIO_ART
  ALIGN -->|store alignment| MINIO_ART
  TTS -->|store tts.wav| MINIO_ART
  VC -->|store converted.wav| MINIO_ART
  LLM -->|store feedback JSON| MINIO_ART

  API_GW -->|read/write task metadata| PG
  ORCH -->|update task status| PG

  ASR -->|metrics| MON
  TTS -->|metrics| MON
  VC -->|metrics| MON
  ALL_LOGS[[All services]] --> LOGS

  K8S --- ASR
  K8S --- TTS
  K8S --- VC
  K8S --- ORCH
  K8S --- ALIGN
  K8S --- PMAP
  K8S --- DIFF
  K8S --- LLM

  SECRETS --- ORCH
  SECRETS --- ASR
  SECRETS --- LLM

  %% === ANNOTATIONS ===
  classDef gpu fill:#ffe6e6,stroke:#ff9999;
  class ASR,TTS,VC gpu;
  classDef storage fill:#eef6ff,stroke:#99c2ff;
  class MINIO_ART,MINIO storage;

  style API_GW fill:#f8f7f3,stroke:#d9d7cc
  style ORCH fill:#f0fff0,stroke:#bfeebb

  click ASR "http://localhost:8001/asr/health" "ASR health (example)"
  click ORCH "http://localhost:8010/orchestrator/health" "Orchestrator health (example)"
```

---

### 2) End-to-End Sequence Diagram (Mermaid)

```mermaid
sequenceDiagram
  autonumber
  participant User as User (Browser)
  participant API as NodeJS API Gateway
  participant Minio as MinIO/S3
  participant Orchestrator as Orchestrator (FastAPI)
  participant Redis as Redis (Queue)
  participant ASR as ASR (WhisperX, GPU)
  participant Align as Alignment (MFA/WhisperX)
  participant Pmap as Phoneme Map (CMUdict)
  participant Diff as Phoneme Diff Engine
  participant TTS as TTS (XTTS/Coqui, GPU)
  participant VC as Voice Conversion (RVC, GPU)
  participant LLM as Feedback LLM (OpenAI/Gemini)
  participant Postgres as Postgres (metadata)
  participant Frontend as Frontend Poller

  Note over User,API: 1) User records audio & clicks upload
  User->>API: POST /api/audio/upload (file)
  API->>Minio: PUT /audio/<taskId>.wav
  Minio-->>API: 200 OK (audio_url)
  API->>Postgres: INSERT task (taskId, audio_url, status=queued)
  API-->>User: 202 Accepted {taskId}

  Note over API,Orchestrator: 2) Orchestrator is notified / polls queue
  API->>Orchestrator: POST /orchestrator/process-all {audio_url, taskId}
  Orchestrator->>Redis: enqueue job (taskId)
  Redis-->>Orchestrator: ack

  Note over Orchestrator,ASR: 3) ASR: Transcription
  Orchestrator->>ASR: POST /asr/process {audio_url}
  ASR-->>Orchestrator: {transcript, words:[{word,start,end}]}
  Orchestrator->>Minio: PUT /artifacts/<taskId>/transcript.json

  Note over Orchestrator,Align: 4) Alignment: phoneme timing
  Orchestrator->>Align: POST /alignment/process {audio_url, transcript}
  Align-->>Orchestrator: {phonemes:[{phoneme,start,end}]}
  Orchestrator->>Minio: PUT /artifacts/<taskId>/alignment.json

  Note over Orchestrator,Pmap: 5) Map words to target phonemes
  Orchestrator->>Pmap: POST /phoneme-map/process {words}
  Pmap-->>Orchestrator: {map: {word: [phonemes]}}
  Orchestrator->>Minio: PUT /artifacts/<taskId>/target_phonemes.json

  Note over Orchestrator,Diff: 6) Diff: user vs target phonemes
  Orchestrator->>Diff: POST /diff/process {user_phonemes, target_phonemes}
  Diff-->>Orchestrator: {comparisons: [...], severity: ...}
  Orchestrator->>Minio: PUT /artifacts/<taskId>/diff.json

  Note over Orchestrator,TTS: 7) TTS: generate US-accent audio
  Orchestrator->>TTS: POST /tts/process {text, voice}
  TTS-->>Orchestrator: {tts_url}
  Orchestrator->>Minio: PUT /artifacts/<taskId>/tts.wav

  Note over Orchestrator,VC: 8) VC: convert TTS into user's voice (optional)
  Orchestrator->>VC: POST /vc/process {tts_url, user_samples}
  VC-->>Orchestrator: {converted_url} or {fallback: tts_url}
  Orchestrator->>Minio: PUT /artifacts/<taskId>/converted.wav

  Note over Orchestrator,LLM: 9) LLM: generate human feedback
  Orchestrator->>LLM: POST /feedback/process {transcript, alignment, user_phonemes, target_phonemes, diff, stress_data}
  LLM-->>Orchestrator: {overall_summary, issues, drills}
  Orchestrator->>Minio: PUT /artifacts/<taskId>/feedback.json

  Note over Orchestrator,Postgres: 10) Finalize task
  Orchestrator->>Postgres: UPDATE task (status=completed, results_url=/artifacts/<taskId>/)
  Orchestrator-->>API: callback or write DB

  Note over Frontend,API: 11) Frontend polls until complete
  Frontend->>API: GET /api/task/:taskId/status
  API->>Postgres: SELECT status, results_url
  API-->>Frontend: 200 {status: completed, results_url}
  Frontend->>Minio: GET /artifacts/<taskId>/feedback.json and audio files
  Frontend-->>User: Render transcript, waveform, TTS/VC audio, LLM feedback & drills

  Note over All: Monitoring & logs:
  ASR->>MON: metrics
  TTS->>MON: metrics
  VC->>MON: metrics
  All->>LOGS: structured logs (request_id, task_id, duration)
```

---

Below is an **enhanced Mermaid diagram** with **clickable nodes** that link to example endpoints (health checks, process endpoints, API docs).
This is the **developer-friendly version** you can paste directly into GitHub or documentation.

Mermaid supports clickable nodes, and here I’ve embedded example localhost URLs (you can replace ports as per your docker-compose).

---

# ✅ **Enhanced Developer Architecture Diagram with Clickable Nodes**

```mermaid
flowchart LR

  %% ================================
  %% SECTION: USER/UI
  %% ================================
  subgraph USER_SIDE["User & UI"]
    direction TB
    Browser[Browser / React UI<br><sub>Uploads audio</sub>]
    Browser -->|POST /api/audio/upload| API_GW["NodeJS API Gateway<br/>(Express + Drizzle)<br><sub><a href='http://localhost:3000/api/docs' target='_blank'>/api/docs</a></sub>"]
  end

  %% ================================
  %% SECTION: BACKEND CORE
  %% ================================
  subgraph BACKEND["Backend Core"]
    API_GW -->|PUT audio| MINIO["MinIO (S3 Compatible)<br><sub><a href='http://localhost:9001' target='_blank'>MinIO Console</a></sub>"]
    API_GW -->|POST /orchestrator/process-all| ORCH["Orchestrator<br/>(FastAPI)<br><sub><a href='http://localhost:8010/docs' target='_blank'>/orchestrator/docs</a><br/><a href='http://localhost:8010/orchestrator/health' target='_blank'>/health</a></sub>"]
  end

  %% ================================
  %% SECTION: REDIS
  %% ================================
  subgraph QUEUE["Queue & Cache"]
    REDIS["Redis<br><sub><a href='http://localhost:6379' target='_blank'>Client: 6379</a></sub>"]
    ORCH -->|enqueue job| REDIS
  end

  %% ================================
  %% SECTION: MICRO SERVICES
  %% ================================
  subgraph MICROS["Microservices (FastAPI)"]
    direction TB

    ASR["ASR Service (WhisperX - GPU)<br/><sub><a href='http://localhost:8001/docs' target='_blank'>/asr/docs</a><br/><a href='http://localhost:8001/asr/health' target='_blank'>/health</a><br/><a href='http://localhost:8001/asr/process' target='_blank'>POST /asr/process</a></sub>"]
    
    ALIGN["Alignment Service<br/><sub><a href='http://localhost:8002/docs' target='_blank'>/alignment/docs</a><br/><a href='http://localhost:8002/alignment/health' target='_blank'>/health</a></sub>"]

    PMAP["Phoneme Map Service (CMUdict)<br/><sub><a href='http://localhost:8003/docs' target='_blank'>/phoneme-map/docs</a><br/><a href='http://localhost:8003/phoneme-map/health' target='_blank'>/health</a></sub>"]

    DIFF["Phoneme Diff Service<br/><sub><a href='http://localhost:8004/docs' target='_blank'>/diff/docs</a><br/><a href='http://localhost:8004/diff/health' target='_blank'>/health</a></sub>"]

    TTS["TTS Service (XTTS/Coqui - GPU)<br/><sub><a href='http://localhost:8005/docs' target='_blank'>/tts/docs</a><br/><a href='http://localhost:8005/tts/health' target='_blank'>/health</a></sub>"]

    VC["Voice Conversion (RVC - GPU)<br/><sub><a href='http://localhost:8006/docs' target='_blank'>/vc/docs</a><br/><a href='http://localhost:8006/vc/health' target='_blank'>/health</a></sub>"]

    LLM["Feedback LLM Service<br/><sub><a href='http://localhost:8007/docs' target='_blank'>/feedback/docs</a><br/><a href='http://localhost:8007/feedback/health' target='_blank'>/health</a></sub>"]

  end

  %% ================================
  %% SECTION: STORAGE
  %% ================================
  subgraph STORAGE["Storage & Database"]
    MINIO2["MinIO/S3 Artifacts<br/><sub>audio/, tts/, vc/, feedback/</sub>"]
    PG["Postgres<br/><sub><a href='http://localhost:5432' target='_blank'>5432</a></sub>"]
  end

  %% ================================
  %% FLOW WIRES
  %% ================================

  %% Orchestrator → Microservices
  ORCH --> ASR
  ORCH --> ALIGN
  ORCH --> PMAP
  ORCH --> DIFF
  ORCH --> TTS
  ORCH --> VC
  ORCH --> LLM

  %% Microservices store artifacts
  ASR --> MINIO2
  ALIGN --> MINIO2
  TTS --> MINIO2
  VC --> MINIO2
  LLM --> MINIO2

  ORCH -->|Update status| PG
  API_GW -->|Fetch results| PG

  %% Styles
  classDef gpu fill:#ffe6e6,stroke:#ff9999;
  class ASR,TTS,VC gpu;

  classDef storage fill:#eef6ff,stroke:#99c2ff;
  class MINIO,MINIO2 storage;

  style API_GW fill:#fdf6e3,stroke:#d8cfa5
  style ORCH fill:#f0fff0,stroke:#bfeebb
```

---

# 🚀 What This Version Gives Developers

### ✔ Clickable links to:

* `/docs` for every microservice
* `/health` for quick testing
* MinIO console
* NodeJS docs
* Database/Redis ports

### ✔ Shows exact endpoints:

* `/asr/process`
* `/alignment/process`
* `/phoneme-map/process`
* `/diff/process`
* `/tts/process`
* `/vc/process`
* `/feedback/process`
* `/orchestrator/process-all`

### ✔ Highlights GPU services visually

### ✔ Maps artifact flow to MinIO

### ✔ Maps metadata flow to Postgres

### ✔ Useful for README, Wiki, Developer Onboarding

---

Below are **two clean developer-focused Mermaid diagrams**:

---

# **📘 Diagram 2 — Internal Microservices Architecture (Developer-Focused Only)**

*(Shows ONLY FastAPI microservices, their responsibilities, key endpoints, and interactions)*

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

    TTS["TTS Service<br/>XTTS / Coqui (GPU)<br/><sub>
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

  %% Styling
  classDef gpu fill:#ffe6e6,stroke:#ff5c5c;
  class ASR,TTS,VC gpu;

  style MICROS fill:#f7faff,stroke:#aac7ff,stroke-width:2px;
```

### ✔ This diagram is perfect for developers because:

* It isolates **only the ML microservices**
* Shows **what each microservice does**
* Shows **key endpoints**
* Highlights **GPU-dependent services**
* Shows **internal data dependencies**

---

# **📘 Diagram 3 — Orchestrator Internal Flow (Step 1 → 8)**

*(This shows EXACTLY how the pipeline works inside the Orchestrator)*

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
  DIFF-->>ORCH: issues + severity + mismatches

  Note over ORCH: Step 5: Build Stress/Schwa/Rhythm Data
  ORCH->>ORCH: Preprocess structured LLM input

  Note over ORCH: Step 6: Generate US Accent Audio
  ORCH->>TTS: POST /tts/process {transcript}
  TTS-->>ORCH: tts_url

  Note over ORCH: Step 7: Optional Voice Conversion
  ORCH->>VC: POST /vc/process {tts_url, user_voice_samples}
  VC-->>ORCH: converted_url (or fallback tts_url)

  Note over ORCH: Step 8: Generate Final Feedback (LLM)
  ORCH->>LLM: POST /feedback/process {all structured inputs}
  LLM-->>ORCH: json feedback (summary, issues, drills)

  ORCH-->>ORCH: Combine all results into final response package
```

### ✔ This diagram is perfect because:

* It **teaches developers the entire pipeline flow**
* Shows EXACT sequence of microservice calls
* Annotates each step with purpose
* Shows what input/output each service consumes/produces
* Helps backend devs debug the pipeline stage-by-stage
* Ideal for onboarding + documentation
