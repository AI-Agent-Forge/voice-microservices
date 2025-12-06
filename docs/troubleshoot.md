# **🔧 AgentForge Voice System — Per-Service Troubleshooting Guide**

This guide helps developers quickly diagnose and fix issues inside every microservice in the AgentForge voice pipeline.

The goal:
➡️ When a request fails, you immediately know **which service broke**, **why**, and **how to fix it**.

---

# **📌 Global Debug Checklist (Before Debugging Any Service)**

Always check these first:

### **1. All containers running**

```bash
docker ps --format "{{.Names}}\t{{.Status}}"
```

### **2. All services respond to health checks**

```bash
curl http://localhost:8001/asr/health  
curl http://localhost:8002/alignment/health
curl http://localhost:8003/phoneme-map/health
curl http://localhost:8004/diff/health
curl http://localhost:8005/tts/health
curl http://localhost:8006/vc/health
curl http://localhost:8007/feedback/health
curl http://localhost:8010/orchestrator/health
```

### **3. Logs for failing service**

```bash
docker-compose logs -f <service-name>
```

### **4. Check GPU availability (for ASR, TTS, VC)**

Inside container:

```bash
nvidia-smi
```

If this fails → GPU not available to Docker.

### **5. Check MinIO connectivity**

Go to:

```
http://localhost:9001
```

---

# --------------------------------------------------------------------

# **1️⃣ ASR Service (WhisperX) — Common Issues & Fixes**

### **❌ Issue: “Model not found” / “Cannot load WhisperX model”**

**Cause:** Model weights not downloaded or volume not mounted.

**Fix:**

* Verify model path inside container:

```bash
ls /models/whisperx
```

* Rebuild image:

```bash
docker-compose build asr-service
```

* Set `WHISPERX_MODEL_SIZE=medium` (or smaller).

---

### **❌ Issue: GPU not accessible**

Symptoms:

* Slow ASR
* Logs print `using CPU`
* Error: “CUDA driver not loaded”

Fix:

* Install NVIDIA Container Toolkit
* Run:

```bash
docker run --gpus all nvidia/cuda:11.8.0-base nvidia-smi
```

---

### **❌ Issue: “Bad audio format”**

Cause: ASR requires 16kHz WAV.

Convert:

```bash
ffmpeg -i input.mp3 -ac 1 -ar 16000 output.wav
```

---

### **❌ Issue: Transcript inaccurate**

Fix:

* Use larger Whisper model
* Ensure audio quality good
* Reduce background noise

---

### **🧪 Quick test**

```bash
curl -F "file=@tests/audio/hello.wav" http://localhost:8001/asr/process
```

---

# --------------------------------------------------------------------

# **2️⃣ Alignment Service (MFA / WhisperX Align) — Troubleshooting**

### **❌ Issue: Alignment fails / returns empty phonemes**

Causes:

* Transcript mismatch
* MFA dictionary missing
* WhisperX alignment model missing

Fixes:

* Check alignment logs for “no speech detected”
* Confirm transcript matches audio exactly
* Use ASR transcript instead of user transcript

---

### **❌ Issue: “Tokenizer not found” or “dictionary missing”**

Fix:

* Ensure CMUdict / MFA dict files copied into `/resources/dicts/`

---

### **❌ Issue: MFA extremely slow**

Fix:

* Switch to WhisperX alignment backend
* Reduce alignment precision in config

---

### **🧪 Quick test**

```bash
curl -X POST http://localhost:8002/alignment/process \
  -H "Content-Type: application/json" \
  -d '{"audio_url":"...", "transcript":"hello world"}'
```

---

# --------------------------------------------------------------------

# **3️⃣ Phoneme Map Service — Troubleshooting**

### **❌ Issue: Word not found in CMUdict**

Fix:

* Implement fallback: grapheme-to-phoneme (G2P)
* Lowercase all words
* Remove punctuation before lookup

---

### **❌ Issue: Output format incorrect**

Make sure result is:

```json
{"map":{"hello":["HH","AH","L","OW"]}}
```

Not strings or nested arrays.

---

### **🧪 Quick test**

```bash
curl -X POST http://localhost:8003/phoneme-map/process \
  -d '{"words":["hello","world"]}'
```

---

# --------------------------------------------------------------------

# **4️⃣ Phoneme Diff Service — Troubleshooting**

### **❌ Issue: No mismatches detected (even when wrong)**

Cause:

* User phonemes not normalized
* Case mismatch
* Missing stress markers

Fix:

* Convert all phonemes to uppercase
* Remove numbers (e.g., AH0 → AH)
* Strip extra whitespace

---

### **❌ Issue: Diff severity always “low”**

Fix:

* Tune severity scoring rules in `rules.py`

---

### **🧪 Quick test**

```bash
curl -X POST http://localhost:8004/diff/process -d '{
  "user_phonemes":{"hello":["HH","AA","L","O"]},
  "target_phonemes":{"hello":["HH","AH","L","OW"]}
}'
```

---

# --------------------------------------------------------------------

# **5️⃣ TTS Service (XTTS/Coqui) — Troubleshooting**

### **❌ Issue: “CUDA out of memory”**

Fix:

* Use FP16
* Switch to smaller model
* Limit batch size

---

### **❌ Issue: Audio distorted / robotic**

Fix:

* Ensure GPU enabled
* Check sampling rate matches 44.1k or 22.05k depending on model
* Update Coqui version to latest

---

### **❌ Issue: Model doesn’t load**

Check:

```bash
ls /models/xtts
```

---

### **🧪 Quick test**

```bash
curl -X POST http://localhost:8005/tts/process \
  -d '{"text":"hello world","voice":"us_female"}'
```

---

# --------------------------------------------------------------------

# **6️⃣ Voice Conversion Service (RVC) — Troubleshooting**

### **❌ Issue: “Voice samples missing”**

Fix:

* Confirm MinIO URLs are valid
* Pre-upload user samples

---

### **❌ Issue: Output sounds like noise**

Fix:

* Increase training steps
* Reduce noise using post-filter
* Ensure input TTS audio is clean

---

### **❌ Issue: GPU memory issues**

Fix:

* Use `--pitch-extraction none`
* Use smaller checkpoint

---

### **🧪 Quick test**

```bash
curl -X POST http://localhost:8006/vc/process \
  -d '{"tts_url":"...", "user_voice_samples":["..."]}'
```

---

# --------------------------------------------------------------------

# **7️⃣ Feedback LLM Service — Troubleshooting**

### **❌ Issue: Hallucinated phonemes or timestamps**

Cause: LLM not constrained.

Fix:

* Use provided strict prompt templates
* Switch temperature=0
* Add `"facts_only": true` flag

---

### **❌ Issue: Wrong JSON format**

Fix:

* Use `response_format={"type":"json_object"}`
* Validate JSON before returning

---

### **❌ Issue: API key errors**

Fix:

* Check `.env` for:

```
OPENAI_API_KEY=
GEMINI_API_KEY=
```

---

### **🧪 Quick test**

```bash
curl -X POST http://localhost:8007/feedback/process \
  -H "Content-Type: application/json" \
  -d '{
       "transcript":"hello world",
       "phoneme_diff":[...]
     }'
```

---

# --------------------------------------------------------------------

# **8️⃣ Orchestrator — Troubleshooting**

### **❌ Issue: Pipeline stops at a specific stage**

Fix:

* Check logs:

```bash
docker-compose logs -f orchestrator
```

* Identify which service call failed

---

### **❌ Issue: Timeout**

Fix:

* Increase timeout in orchestrator config
* Add `retry_on_fail=True` per service call

---

### **❌ Issue: Missing final JSON fields**

Fix:

* Ensure `results_builder.py` merges all service outputs
* Validate structure with test cases under `tests/`

---

### **❌ Issue: “Cannot connect to microservice”**

Fix:

* Use internal Docker hostname, NOT localhost:

```
http://asr-service:8001/asr/process
```

---

### **🧪 Quick end-to-end test**

```bash
curl -F "file=@tests/audio/hello.wav" \
  http://localhost:8010/orchestrator/process-all
```

---

# --------------------------------------------------------------------

# **9️⃣ MinIO/S3 — Troubleshooting**

### **❌ Issue: 403 Access Denied**

Fix:

* Check `.env`:

```
MINIO_ROOT_USER=
MINIO_ROOT_PASSWORD=
MINIO_BUCKET=audio
```

---

### **❌ Issue: File not found**

Fix:

* Ensure `PUT` succeeded
* Check path:

```
audio/<taskId>/tts.wav
audio/<taskId>/converted.wav
audio/<taskId>/feedback.json
```

---

### **🧪 Verify MinIO**

Visit:

```
http://localhost:9001
```

---

# --------------------------------------------------------------------

# **🔟 Postgres Troubleshooting**

### **❌ Cannot connect**

Check DSN in `.env`:

```
DATABASE_URL=postgresql://user:pass@pg:5432/db
```

---

### **❌ Task statuses not updating**

Fix:

* Check orchestrator DB write logic
* Verify migrations applied correctly

---

### **🧪 Quick test**

```bash
docker exec -it af_postgres psql -U user -d db -c "SELECT * FROM tasks;"
```

---

# --------------------------------------------------------------------

# **1️⃣1️⃣ Quick “Root Cause Finder” Table**

| Symptom                     | Most Likely Service | Fix                       |
| --------------------------- | ------------------- | ------------------------- |
| Transcript wrong            | ASR                 | Use bigger model          |
| No phonemes                 | Alignment           | Fix transcript mismatch   |
| No mismatches detected      | Diff                | Normalize phonemes        |
| No TTS audio                | TTS                 | GPU or model load issue   |
| Very noisy voice conversion | VC                  | Improve training data     |
| Feedback JSON wrong shape   | LLM                 | Fix prompt template       |
| Pipeline stops midway       | Orchestrator        | Logs show failing service |
| File missing                | MinIO               | Check bucket + prefix     |
