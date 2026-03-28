# Feedback LLM Integration & End-to-End Testing Guide

This document summarizes the final integration of the **Feedback LLM Microservice** (Step 5.7) into the voice-microservices pipeline, details the data flow across the ecosystem, and provides a clear guide for the team lead on how to test the platform.

---

## 1. What Was Completed Today

We successfully replaced the mocked "Feedback LLM" stub with a production-ready, highly validated microservice. The pipeline is now fully integrated from ASR (Speech-to-Text) through Phoneme Alignment, Diff generation, TTS synthesis, and finally **LLM-powered Pronunciation Coaching**.

### 🔹 Backend: Feedback LLM Service
- **Dual AI Support:** Implemented an agnostic `LLMClient` supporting both OpenAI (GPT-4o) and Google Gemini via `.env` configurations.
- **Dynamic Prompting:** Created a robust Jinja2 templating system (`prompt_loader.py`) that loads from a `/prompts/` volume, utilizing few-shot examples to guarantee consistent responses.
- **Strict JSON Validation:** Implemented `FeedbackValidator` using Pydantic. It strips markdown fences, parses JSON, and cross-checks the LLM's output against the raw pipeline input to prevent hallucination (e.g., verifying that the LLM only generates feedback for words actually spoken).
- **Auto-Correction & Retry:** If the LLM generates an invalid schema, the service automatically sends a "Correction Prompt" with the parse error, retrying the generation before gracefully degrading to a safe fallback.
- **Mock Mode:** Added a `MOCK_MODE=true` toggle that generates rich, deterministic feedback locally without requiring an API key, allowing frontend devs to work offline.

### 🔹 Orchestrator Integration
- Updated the pipeline orchestrator (`flow.py`) to properly bundle the results of ASR, Alignment, Phoneme Map, and Phoneme Diff into a single payload for the Feedback LLM.
- Added timeout handling (45s) and safe fallbacks so the pipeline won't crash if the LLM provider experiences latency.

### 🔹 Frontend UI Enhancements
- Created a highly polished `FeedbackPanel.tsx` component in the Practice Arena.
- **Score Rings:** Visualized Overall, Accuracy, Fluency, and Prosody scores out of 100.
- **Pronunciation Issues:** Mapped LLM output to cards showing severity badges (Low/Medium/High), the exact phoneme error, and actionable fix instructions.
- **Practice Drills:** Added generated minimal pairs, repeat phrases, and focus phonemes.
- **Strengths & Tips:** Added positive reinforcement and prioritized improvement suggestions based on the user's audio.

---

## 2. The 6-Step Pipeline Architecture

Here is the exact flow of data when a user hits "Analyze" in the UI:

1. **ASR Service (Port 8001):** Transcribes the raw `.wav` audio to text.
2. **Alignment Service (Port 8002):** Forces a phonetic alignment, mapping exactly when the user spoke specific ARPAbet sounds.
3. **Phoneme Map Service (Port 8003):** Looks up the "Target" (Perfect American English) pronunciation pattern from the CMUdict.
4. **Phoneme Diff Service (Port 8004):** Compares the user's spoken sounds against the target sounds, identifying substitutions, insertions, or vowel shifts.
5. **TTS Service (Port 8005):** Generates a perfect "Reference Audio" clip of the target text using Gemini TTS.
6. **Feedback LLM Service (Port 8007):** Ingests artifacts from all previous 5 steps, analyzes them with an LLM, and produces the final actionable JSON coaching report.

*Note: The **Voice Conversion Service** (Port 8006) runs in parallel for cloning purposes.*

---

## 3. How to Test Cleanly (Team Lead Guide)

Due to the heavy machine learning models (Whisper, Wav2Vec2, etc.), **testing this application requires a dedicated GPU (e.g., AWS EC2 with an NVIDIA T4/A10G or a local Linux machine with an RTX GPU).** Running this stack on local CPU/Windows via Docker Desktop will likely result in out-of-memory errors, disk-space crashes, or extreme lag.

### Step 1: Clone and Configure
Clone the repo on the GPU machine. Copy the environment template:
```bash
cp .env.example .env
```
Populate `.env` with API keys:
```env
LLM_PROVIDER=gemini           # Setup for the feedback service
LLM_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your_key_here
```

### Step 2: Build and Start Services
We recommend building the containers without cache the first time:
```bash
docker compose build --no-cache
docker compose up -d
```

### Step 3: Verify Container Health
Wait ~2 minutes for the heavy models to load into VRAM. Check the status:
```bash
docker compose ps
```
You can verify the Feedback LLM is active by pinging its health route:
```bash
curl http://localhost:8007/health
# Should return: {"status":"ok","service":"feedback-llm-service", ...}
```

### Step 4: Run the Frontend
In a secondary terminal, start the UI:
```bash
cd ui
npm install
npm run dev
```

### Step 5: End-to-End Test in UI
1. Open the browser to `http://localhost:5173`.
2. Navigate to the **Practice Arena**.
3. Speak a test phrase into the microphone (e.g., intentionally mispronouncing "Three thousand" as "Tree tousand").
4. Click **Analyze**.
5. Wait for the pipeline to finish (Orchestrator logs will show progress through Steps 1 to 6).
6. **Verify the UI Output:**
   - You should hear your audio playback clearly.
   - The **Alignment** table will show exactly where you said "T" instead of "TH".
   - The **AI Feedback Panel** will render at the bottom, highlighting the "consonant_error" with severity "high", instructional fixes on where to place your tongue, and "minimal pair" practice drills (e.g., tree vs three).
