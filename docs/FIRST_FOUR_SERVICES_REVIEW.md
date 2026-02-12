# First Four Microservices - Review Document

**Author:** Backend Engineer  
**Date:** February 12, 2026  
**Status:** ✅ Complete & Tested

---

## Overview

This document covers the implementation and testing of the first four microservices in the AgentForge Voice Processing Pipeline:

| # | Service | Port | Purpose |
|---|---------|------|---------|
| 1 | ASR Service | 8001 | Speech-to-text transcription with word timestamps |
| 2 | Alignment Service | 8002 | Phoneme-level forced alignment |
| 3 | Phoneme-Map Service | 8003 | CMUdict canonical phoneme lookup |
| 4 | Phoneme-Diff Service | 8004 | User vs target phoneme comparison |

---

## Quick Start

### 1. Start Services

```bash
cd voice-microservices
docker compose up -d redis minio postgres asr-service alignment-service phoneme-map-service phoneme-diff-service
```

### 2. Verify Health

```bash
curl http://localhost:8001/health  # ASR
curl http://localhost:8002/health  # Alignment
curl http://localhost:8003/health  # Phoneme-Map
curl http://localhost:8004/health  # Phoneme-Diff
```

### 3. Run E2E Test

```bash
python3 tests/e2e_test_first_four_services.py
```

---

## Service Details

### 1. ASR Service (Port 8001)

**Technology:** WhisperX (GPU-accelerated)

**Endpoints:**
- `POST /asr/process` - Upload audio file for transcription
- `POST /asr/url` - Transcribe from audio URL
- `GET /health` - Health check

**Sample Request:**
```bash
curl -X POST http://localhost:8001/asr/process \
  -F "file=@audio.wav" \
  -F "language=en"
```

**Sample Response:**
```json
{
  "transcript": "Hello world",
  "words": [
    {"word": "Hello", "start": 0.12, "end": 0.45},
    {"word": "world", "start": 0.55, "end": 1.00}
  ]
}
```

---

### 2. Alignment Service (Port 8002)

**Technology:** g2p_en (Grapheme-to-Phoneme)

**Endpoints:**
- `POST /alignment/process` - Get phoneme timestamps
- `GET /health` - Health check

**Sample Request:**
```bash
curl -X POST http://localhost:8002/alignment/process \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "http://minio:9000/bucket/audio.wav",
    "transcript": "hello world",
    "words": [
      {"word": "hello", "start": 0.0, "end": 0.5},
      {"word": "world", "start": 0.6, "end": 1.0}
    ]
  }'
```

**Sample Response:**
```json
{
  "phonemes": [
    {"symbol": "HH", "word": "hello", "start": 0.0, "end": 0.125},
    {"symbol": "AH", "word": "hello", "start": 0.125, "end": 0.25},
    {"symbol": "L", "word": "hello", "start": 0.25, "end": 0.375},
    {"symbol": "OW", "word": "hello", "start": 0.375, "end": 0.5}
  ],
  "duration": 3.0
}
```

---

### 3. Phoneme-Map Service (Port 8003)

**Technology:** CMUdict + g2p_en fallback

**Endpoints:**
- `POST /phoneme-map/process` - Map words to canonical phonemes
- `GET /health` - Health check

**Sample Request:**
```bash
curl -X POST http://localhost:8003/phoneme-map/process \
  -H "Content-Type: application/json" \
  -d '{"words": ["hello", "world", "beautiful"]}'
```

**Sample Response:**
```json
{
  "map": {
    "hello": ["HH", "AH", "L", "OW"],
    "world": ["W", "ER", "L", "D"],
    "beautiful": ["B", "Y", "UW", "T", "AH", "F", "AH", "L"]
  }
}
```

---

### 4. Phoneme-Diff Service (Port 8004)

**Technology:** Rule-based phoneme comparison engine

**Endpoints:**
- `POST /diff/process` - Compare user vs target phonemes
- `GET /health` - Health check

**Sample Request:**
```bash
curl -X POST http://localhost:8004/diff/process \
  -H "Content-Type: application/json" \
  -d '{
    "user_phonemes": {"hello": ["HH", "EH", "L", "OW"]},
    "target_phonemes": {"hello": ["HH", "AH", "L", "OW"]}
  }'
```

**Sample Response:**
```json
{
  "comparisons": [
    {
      "word": "hello",
      "user": ["HH", "EH", "L", "OW"],
      "target": ["HH", "AH", "L", "OW"],
      "issue": "vowel_shift",
      "severity": "low",
      "notes": "EH → AH",
      "details": [...]
    }
  ]
}
```

---

## End-to-End Flow

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  ASR (8001) │───▶│ Alignment    │───▶│ Phoneme-Map  │───▶│ Phoneme-Diff │
│             │    │ (8002)       │    │ (8003)       │    │ (8004)       │
│ Audio → Text│    │ Text → Phone │    │ Words → CMU  │    │ Compare      │
│ + timestamps│    │ timestamps   │    │ phonemes     │    │ phonemes     │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Data Flow Example:**

1. **ASR Input:** `audio.wav`
2. **ASR Output:** `"We'll see you later."` + word timestamps
3. **Alignment Output:** 11 phonemes with timestamps (W, EH, L, S, IY, Y, UW, L, EY, T, ER)
4. **Phoneme-Map Output:** Target phonemes from CMUdict
5. **Phoneme-Diff Output:** Comparison showing pronunciation issues

---

## Test Results

### E2E Test Output (February 12, 2026)

```
======================================================================
  FULL END-TO-END TEST - ALL FOUR SERVICES CONNECTED
======================================================================

STEP 1: ASR Service - Transcribing Audio
✅ ASR SUCCESS
   Transcript: 'We'll see you later.'
   Words: 4

STEP 2: Alignment Service - Getting Phoneme Timestamps
✅ ALIGNMENT SUCCESS
   Duration: 3.0s
   Phonemes: 11

STEP 3: Phoneme-Map Service - Getting Target Phonemes (CMUdict)
✅ PHONEME-MAP SUCCESS
   Mapped 4 words to target phonemes

STEP 4: Phoneme-Diff Service - Comparing User vs Target Phonemes
✅ PHONEME-DIFF SUCCESS
   Compared 4 words: 1 pronunciation issue found

======================================================================
  ✅✅✅ ALL FOUR SERVICES WORKING END-TO-END ✅✅✅
======================================================================
```

---

## Files Changed

| File | Change |
|------|--------|
| `docker-compose.yml` | Fixed alignment service port mapping (8002:8002) |
| `tests/e2e_test_first_four_services.py` | Added comprehensive E2E test |

---

## Swagger UI

Access interactive API documentation:

- **ASR:** http://localhost:8001/docs
- **Alignment:** http://localhost:8002/docs
- **Phoneme-Map:** http://localhost:8003/docs
- **Phoneme-Diff:** http://localhost:8004/docs

---

## Next Steps

Remaining services to implement:
- TTS Service (8005)
- Voice Conversion Service (8006)
- Feedback LLM Service (8007)
- Pipeline Orchestrator (8010)

---

## Notes for Reviewer

1. All services use FastAPI with proper error handling
2. Health endpoints implemented for all services
3. Services are containerized with Docker
4. GPU support configured for ASR service (WhisperX)
5. MinIO integration working for audio storage
6. CMUdict used for canonical US accent phonemes
