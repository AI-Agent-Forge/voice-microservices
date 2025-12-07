Below is a **complete set of ready-to-run cURL commands** for every microservice in your pipeline.
Replace ports only if your `docker-compose.yml` uses different ones.

These commands assume:

```
ASR              → :8001
ALIGNMENT        → :8002
PHONEME MAP      → :8003
PHONEME DIFF     → :8004
TTS              → :8005
VOICE CONVERSION → :8006
FEEDBACK LLM     → :8007
ORCHESTRATOR     → :8010
```

---

# ✅ **1. Upload / Provide Audio**

If audio exists locally:

**upload to orchestrator or MinIO**

### (Optional) Upload directly to orchestrator

```bash
curl -X POST "http://localhost:8010/orchestrator/upload-audio" \
  -F "file=@./tests/audio/hello-world.wav"
```

**Expected Response:**

```json
{
  "audio_url": "http://minio:9000/audio/hello-world.wav"
}
```

Use this `audio_url` in next steps.

---

# ✅ **2. ASR Service (WhisperX)**

**Goal:** transcript + word timestamps

### If using file upload:

```bash
curl -X POST "http://localhost:8001/asr/process" \
  -F "file=@./tests/audio/hello-world.wav"
```

### If using audio_url:

```bash
curl -X POST "http://localhost:8001/asr/process-url" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "http://minio:9000/audio/hello-world.wav"
  }'
```

---

# 🧱 **ASR Expected Output**

```json
{
  "transcript": "hello world",
  "words": [
    {"word": "hello", "start": 0.12, "end": 0.45},
    {"word": "world", "start": 0.55, "end": 1.00}
  ]
}
```

Copy this transcript to use in Alignment.

---

# ✅ **3. Alignment Service**

**Goal:** phoneme-level timestamps

```bash
curl -X POST "http://localhost:8002/alignment/process" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "http://minio:9000/audio/hello-world.wav",
    "transcript": "hello world"
  }'
```

---

# 🧱 **Alignment Expected Output**

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

---

# ✅ **4. Phoneme Map Service (CMUdict)**

**Goal:** canonical US phonemes for each word

```bash
curl -X POST "http://localhost:8003/phoneme-map/process" \
  -H "Content-Type: application/json" \
  -d '{
    "words": ["hello", "world"]
  }'
```

---

# 🧱 **Expected Output**

```json
{
  "map": {
    "hello": ["HH","AH","L","OW"],
    "world": ["W","ER","L","D"]
  }
}
```

---

# ✅ **5. Phoneme Diff Service**

**Goal:** Compare user vs. target phonemes → detect issues

Example using one word:

```bash
curl -X POST "http://localhost:8004/diff/process" \
  -H "Content-Type: application/json" \
  -d '{
    "user_phonemes": {
      "hello":["HH","AA","L","O"]
    },
    "target_phonemes": {
      "hello":["HH","AH","L","OW"]
    }
  }'
```

---

# 🧱 **Expected Output**

```json
{
  "comparisons":[
    {
      "word":"hello",
      "user":["HH","AA","L","O"],
      "target":["HH","AH","L","OW"],
      "issue":"vowel_shift",
      "notes":"AA used instead of AH"
    }
  ]
}
```

---

# ✅ **6. TTS Service (Gemini TTS)**

**Goal:** Generate American-accent audio using Gemini TTS API

**Available Voices:** Aoede, Charon, Fenrir, **Kore** (default), Puck, Zephyr, Orus, Leda, Helios, Nova, Altair, Lyra, Orion, Vega, Clio, Dorus, Echo, Fable, Cove, Sky, Sage, Ember, Vale, Reef, Aria, Ivy, Stone, Quill, Drift, Briar

```bash
curl -X POST "http://localhost:8005/tts/process" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "hello world",
    "voice": "Kore"
  }'
```

---

# 🧱 **Expected Output**

```json
{
  "audio_url": "http://minio:9000/audio/tts/abc123.wav",
  "voice": "Kore",
  "model": "gemini-2.5-flash-preview-tts",
  "duration_estimate": 1.25
}
```

---

# ✅ **7. Voice Conversion Service (optional)**

**Goal:** Convert the American-accent TTS into user’s voice

```bash
curl -X POST "http://localhost:8006/vc/process" \
  -H "Content-Type: application/json" \
  -d '{
    "tts_url": "http://minio:9000/audio/hello-world-tts.wav",
    "user_voice_samples": [
      "http://minio:9000/audio/user-voice-1.wav"
    ]
  }'
```

---

# 🧱 **Expected Output**

```json
{
  "converted_url": "http://minio:9000/audio/hello-world-uservc.wav"
}
```

---

# ✅ **8. Feedback LLM Service**

**Goal:** Structured pronunciation feedback using your prompt templates

```bash
curl -X POST "http://localhost:8007/feedback/process" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript":"hello world",
    "alignment":[{"phoneme":"HH","start":0.12,"end":0.18}],
    "user_phonemes":{"hello":["HH","AA","L","O"]},
    "target_phonemes":{"hello":["HH","AH","L","OW"]},
    "phoneme_diff":[{"word":"hello","issue":"vowel_shift"}],
    "stress_data": {"word_stress":[...]}
  }'
```

---

# 🧱 **Expected Output**

```json
{
  "overall_summary":"Good attempt; main issue is the vowel in 'hello'.",
  "issues":[
    {
      "word":"hello",
      "issue_type":"vowel_shift",
      "explanation":"AA was used instead of AH.",
      "severity":"medium"
    }
  ],
  "drills": {
    "minimal_pairs": ["hut–hot","cup–cop"]
  }
}
```

---

# 🚀 **9. Orchestrator — Full End-to-End Pipeline**

This is the API your frontend will call.

### Option A — Upload file

```bash
curl -X POST "http://localhost:8010/orchestrator/process-all" \
  -F "file=@./tests/audio/hello-world.wav"
```

### Option B — Provide audio URL

```bash
curl -X POST "http://localhost:8010/orchestrator/process-all" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "http://minio:9000/audio/hello-world.wav"
  }'
```

---

# 🧱 **Orchestrator Expected Final JSON**

```json
{
  "transcript":"hello world",
  "alignment":[...],
  "phonemes":{
    "user":{...},
    "target":{...}
  },
  "phoneme_diff":[...],
  "tts_url":"http://minio:9000/audio/hello-world-tts.wav",
  "voice_converted_url":"http://minio:9000/audio/hello-world-uservc.wav",
  "feedback":{...},
  "status":"completed"
}
```
