# Architecture Diagram — AgentForge Voice Microservices

Below are three representations of the system architecture you can use immediately:

1. **Mermaid diagram** (renderable in many docs/markdown viewers) — suggested for documentation.
2. **ASCII overview** — quick text view for terminals or plain README.
3. **Deployment & integration notes** — mapping to AWS/GCP components, networking, security, scaling, monitoring, and request sequence.

---

# 1) Mermaid diagram (paste into a Mermaid-capable viewer)

```mermaid
flowchart LR
  subgraph USER
    A[Web Client<br/>(React)] -->|Upload audio / Record| API_GW[NodeJS API (Express)]
  end

  subgraph UI_Backend
    API_GW -->|POST /api/audio/upload| ORCH[Orchestrator Service<br/>(FastAPI)]
    API_GW -->|Task polling| DB[(Postgres / Drizzle)]
  end

  subgraph SERVICES
    ORCH -->|1. send audio| ASR[ASR Service<br/>WhisperX - GPU]
    ORCH -->|2. transcript| ALIGN[Alignment Service<br/>MFA / WhisperX]
    ORCH -->|3. phoneme map| PMAP[Phoneme Map Service<br/>CMUdict]
    ORCH -->|4. diff| DIFF[Phoneme Diff Service]
    ORCH -->|5. tts request| TTS[TTS Service<br/>XTTS/Coqui - GPU]
    ORCH -->|6. vc request| VC[Voice Conversion Service<br/>RVC - GPU]
    ORCH -->|7. feedback request| LLM[Feedback LLM Service<br/>OpenAI / Gemini / Local]
  end

  subgraph STORAGE
    MINIO[(MinIO / S3)]
    OBJ[(Audio blobs, models, artifacts)]
    MINIO --- OBJ
  end

  subgraph INFRA
    REDIS[Redis / Celery Broker]
    K8S[Kubernetes / GKE / EKS]
    MON[Prometheus + Grafana]
    LOGS[ELK / CloudWatch]
    SECRETS[Secrets Manager / Vault]
  end

  ASR -->|store audio/transcript| MINIO
  ALIGN --> MINIO
  TTS --> MINIO
  VC --> MINIO
  LLM --> MINIO
  ORCH --> DB
  ORCH --> REDIS
  ASR -->|metrics| MON
  TTS --> MON
  VC --> MON
  ALL --> LOGS
  K8S --- ASR
  K8S --- TTS
  K8S --- VC
  K8S --- ORCH
  API_GW --- K8S

  click ASR "http://localhost:8001" "ASR service"
  click TTS "http://localhost:8005" "TTS service"
```

---

# 2) ASCII diagram (compact)

```
[User Browser (React)]
        |
        v
[NodeJS API Gateway (Express + Drizzle/Postgres)]
        |
        v
[Orchestrator (FastAPI)] -- Redis/Celery --> workers
        |
   ---------------------------
   |    |     |      |      |
   v    v     v      v      v
 [ASR][Align][PhMap][Diff][LLM]
  (GPU) (CPU) (CPU) (CPU) (LLM)
   |                       |
   v                       v
 [TTS]                  [VoiceConv]
 (GPU)                    (GPU)
   |                       |
   -------------------------
            |
            v
         [MinIO / S3]
            |
            v
        [Postgres]
            |
            v
   [Monitoring: Prom/Grafana]
   [Logging: ELK / CloudWatch]
   [Secrets: AWS Secrets Manager / Vault]
```

---

# 3) Detailed components & mapping

## Core components

* **Frontend:** React app (Vite or Next). Audio capture, playback, waveform, polling UI.
* **API Gateway:** Node.js + Express + TypeScript — session, uploads, DB, orchestration calls.
* **Orchestrator:** FastAPI service coordinating pipeline stages asynchronously (task queue).
* **Microservices (FastAPI):**

  * **ASR Service (WhisperX)** — GPU-enabled inference for transcription + timestamps.
  * **Alignment Service (WhisperX alignment or MFA)** — phoneme timing.
  * **Phoneme Map Service** — CMUdict mapping.
  * **Phoneme Diff Service** — rule engine for Indian→US mismatch detection.
  * **TTS Service (XTTS/Coqui)** — GPU TTS generation.
  * **Voice Conversion Service (RVC / so-vits-svc)** — few-shot voice conversion (GPU).
  * **Feedback LLM Service** — runs prompt templates against OpenAI/Gemini/local LLM and returns structured JSON.
* **Storage:** MinIO for dev (S3 in prod) — audio artifacts, model caches, screenshots.
* **DB:** Postgres (Drizzle ORM on Node) — sessions, task metadata, analytics.
* **Queue & Cache:** Redis (Celery/RQ) — asynchronous job orchestration and worker coordination.
* **Infra Orchestration:** Kubernetes (GKE/EKS) or ECS; GPU node pools for heavy services.
* **Monitoring & Logging:** Prometheus + Grafana for metrics; ELK or CloudWatch for logs.
* **Secrets Management:** AWS Secrets Manager / GCP Secret Manager / HashiCorp Vault.

## Network & Security

* **VPC** with private subnets for ML GPU nodes.
* **Load Balancer (ALB / GCLB)** fronting API Gateway and orchestrator.
* TLS via ACM / Managed Certs.
* RBAC for Kubernetes; least-privilege IAM roles for service accounts.
* MinIO access via per-service credentials; store credentials in Secrets Manager.
* Per-tenant isolation: artifacts stored under tenant prefixes in S3, strict ACLs.

## Scaling

* **ASR / TTS / VC** → GPU node pool; horizontal autoscaling via KEDA/HPA based on queue depth and GPU utilization.
* **Stateless services (alignment, phoneme map, diff, feedback)** → scale horizontally via replicas.
* Use **spot/interruptible instances** for cost-effective non-latency-critical batch jobs (conversion training, large fine-tuning).
* **Task queue** to buffer load; process concurrently using worker replicas.

---

# 4) Request lifecycle (sequence)

1. **User** records & uploads audio to NodeJS API (`/api/audio/upload`).
2. Node stores file in MinIO and creates a task row in Postgres (status: queued).
3. Node enqueues task in Redis/Celery and returns `taskId`.
4. **Orchestrator worker** picks the job:

   * fetch audio from MinIO
   * call ASR → get transcript + word timestamps → store artifact
   * call Alignment → produce phoneme timestamps → store artifact
   * call Phoneme Map → generate canonical phonemes
   * call Phoneme Diff → compute differences and issues
   * call TTS → generate US-accent audio
   * call Voice Conversion → convert TTS to user's voice (if opted and samples provided)
   * call Feedback LLM → produce structured feedback using prompt templates
5. Orchestrator writes final aggregated result to Postgres + MinIO (artifacts).
6. Frontend polls `/api/task/:id/status` and then fetches results when complete.
7. Metrics emitted to Prometheus; logs to ELK/CloudWatch for troubleshooting.

---

# 5) Deployment recommendations (AWS example)

* **Kubernetes:** EKS cluster with two node pools:

  * `gpu-pool` (p3/p4, A10G, T4) for ASR/TTS/VC — autoscale min 0 / max N
  * `cpu-pool` for orchestrator, alignment, phoneme map, diff, LLM proxy
* **Storage:** S3 for production; MinIO for dev.
* **Queue:** Elasticache Redis cluster.
* **DB:** RDS Postgres (multi-AZ).
* **Secrets:** AWS Secrets Manager (or HashiCorp Vault for multi-cloud).
* **Load Balancer:** ALB for HTTP routing, TLS managed via ACM.
* **CI/CD:** GitHub Actions → build images → push to ECR/GCR → deploy via ArgoCD/Flux/helm.
* **Cost control:** idle VM auto-shutdown for user VMs (AgentForge core), use short-lived GPU jobs where possible, spot instances for batch training.

---

# 6) Observability & SLOs

* **Metrics to track:**

  * Task queue depth (Redis)
  * End-to-end latency (upload → completed)
  * Per-stage latency (ASR, alignment, TTS, VC, LLM)
  * GPU utilization and memory
  * Error rates per service
* **Alerts:**

  * Task failure rate > X%
  * Queue length > threshold
  * GPU OOMs or crashes
* **Logging:**

  * Structured logs (JSON) with `request_id`, `task_id`, `tenant_id`
  * Centralized logs with retention policy for compliance
* **SLOs (example):**

  * 95% of short clips (<6s) processed < 20s
  * System availability 99.9%

---

# 7) Security & Privacy considerations

* Explicit user consent before storing audio for training.
* Data-at-rest encryption: S3 SSE-KMS.
* Minimize PII in logs; mask any sensitive content.
* Voice cloning requires explicit opt-in and clear UI consent.
* Implement per-customer resource quotas and hard stops to avoid cost overruns.

---

# 8) Deliverables for documentation

* Mermaid and PNG diagrams (use Mermaid for auto-render; export PNG for slides).
* README with architecture overview and deployment steps.
* Network diagram showing VPC/subnet/ALB/EKS mapping.
* Runbook for on-call: how to investigate failed tasks, restart workers, repro steps.
