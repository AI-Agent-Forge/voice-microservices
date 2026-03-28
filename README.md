# AgentForge Voice Microservices

This repository contains FastAPI microservices and an orchestrator that process a spoken audio clip end-to-end and return structured pronunciation analysis and audio artifacts.

## Services
- **ASR** — Port 8001 — Speech-to-text transcription
- **Alignment** — Port 8002 — Forced phoneme alignment with timestamps
- **Phoneme Map** — Port 8003 — CMUdict phoneme lookup for words
- **Phoneme Diff** — Port 8004 — User vs target phoneme comparison
- **TTS** — Port 8005 — Gemini text-to-speech synthesis
- **Voice Conversion** — Port 8006 — Voice cloning/conversion
- **Feedback LLM** — Port 8007 — LLM-powered pronunciation feedback (OpenAI/Gemini)
- **Orchestrator** — Port 9010 — Pipeline coordination

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
docker-compose build --pull
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
- The Feedback LLM Service supports both OpenAI and Google Gemini via `LLM_PROVIDER` env var. No GPU required — it runs on CPU.

### Environment Variables (Feedback LLM)
| Variable | Description | Default |
|---|---|---|
| `LLM_PROVIDER` | LLM backend: `gemini` or `openai` | `gemini` |
| `LLM_MODEL` | Model name (auto-selects if empty) | `gemini-2.5-flash` |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `OPENAI_API_KEY` | OpenAI API key (if using openai) | — |
| `MOCK_MODE` | Return mock responses without LLM | `false` |

## UI Setup

The `ui/` directory contains a React application for interacting with the voice microservices.

### Tech Stack
- **React 19** with TypeScript
- **Vite** for development and build
- **TailwindCSS** for styling
- **Zustand** for state management
- **Framer Motion** for animations
- **WaveSurfer.js** for audio visualization

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
cd ui
npm install
```

### Development
```bash
npm run dev
```
The UI will be available at `http://localhost:5173`

### Build
```bash
npm run build
```

### Configuration
The UI connects to the orchestrator service. Ensure the backend services are running before starting the UI.

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `VITE_API_URL` | Orchestrator API URL | `http://localhost:8010` |

