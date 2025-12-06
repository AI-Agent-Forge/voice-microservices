# **📘 AgentForge — Voice Microservices Project

Final Technical Brief & Deliverables for Backend Developer**

## **1. Project Overview**

AgentForge is building a **Voice-Based Accent Coaching Engine**, which analyzes a user’s spoken audio and provides:

* High-accuracy ASR transcription
* Phoneme-level forced alignment
* Phoneme mapping + diffing
* Stress, rhythm, intonation & schwa analysis
* US accent TTS
* Voice conversion into the user’s own voice
* LLM-based pronunciation feedback in structured JSON

This engine will run inside a unified **microservices architecture**, enabling the frontend to send an audio clip and receive a complete, AI-generated pronunciation analysis.

This document summarizes **what you need to build**, **how the system works**, and **what the final deliverable must include**.

All detailed docs (folder structure, prompts, docker-compose, architecture diagram, test cases, etc.) are already prepared separately.

---

## **2. High-Level Goal**

Build a **fully functional, dockerized backend system** composed of multiple FastAPI microservices and an orchestrator, capable of processing a spoken audio clip end-to-end and returning:

* Transcript & timestamps
* Alignment & phoneme timestamps
* Canonical phonemes (CMUdict)
* User phonemes vs US phonemes diff
* US-accent TTS audio
* User-voice converted TTS audio
* Detailed LLM feedback (stress, intonation, rhythm, schwa, errors, corrections)

All services must run individually and together via `docker-compose`.

---

## **3. Architecture Summary**

The full system consists of 8 microservices:

### **1. ASR Service (WhisperX)**

* Input: audio
* Output: transcript + word-level timestamps
* GPU required
* Also supports MOCK mode

### **2. Alignment Service**

* Input: audio + transcript
* Output: phoneme-level timestamps
* Uses MFA or WhisperX alignment

### **3. Phoneme Map Service**

* Input: words
* Output: CMUdict phonemes

### **4. Phoneme Diff Service**

* Input: user phonemes vs target phonemes
* Output: vowel shifts, stress issues, consonant changes, severity scoring

### **5. TTS Service (XTTS/Coqui)**

* Input: text
* Output: American-accent audio (URL)
* GPU required

### **6. Voice Conversion Service (RVC)**

* Input: TTS audio + user’s voice samples
* Output: US accent audio *in user’s voice*
* GPU required

### **7. Feedback LLM Service**

* Input: transcript + phoneme diff + alignment
* Output: JSON feedback (stress, schwa, drills, minimal pairs, rhythm, corrections)
* Uses prepared LLM prompt templates

### **8. Orchestrator Service**

* Connects all microservices end-to-end
* Produces final JSON response + audio URLs
* The main entrypoint for the frontend

---

## **4. Your Responsibilities**

You are responsible for implementing:

### **A. Microservice Code**

Each microservice must include:

* FastAPI application
* Service logic under `/services`
* Utility helpers under `/utils`
* API routers under `/routers`
* OpenAPI documentation
* Mock mode support
* GPU-enabled Dockerfile (for selected services)

Detailed code stubs and folder structure were already given.

---

### **B. Dockerization**

Each microservice must run via:

* `Dockerfile` (GPU-enabled where required)
* Tested inside the global `docker-compose.yml`

---

### **C. Integration With Orchestrator**

The orchestrator must:

* Accept audio
* Store temporarily (local or MinIO)
* Call each microservice in order
* Handle retries & timeouts
* Return unified output JSON

A reference flow and OpenAPI spec are already provided.

---

### **D. Test Suite**

All tests must run using:

* Provided mock audio files
* Mock JSON responses
* pytest or similar test runner

Tests include:

* Unit tests for each microservice
* Integration tests for full pipeline (mock mode)

---

### **E. Prompt Templates Integration**

LLM microservice must load prompts from:

```
/prompts/
```

Files are already written:

* stress detection
* schwa errors
* sentence-level rhythm
* unified feedback prompt
* guardrails
* fallback prompts

---

### **F. Monitoring Hooks**

Each microservice must emit basic logs:

* request_id
* timestamps
* duration
* errors

(No metrics system required for MVP, but code must be structured so it can be plugged in later.)

---

## **5. Definition of Done (DoD)**

The project is considered complete when:

### ✔ All 8 microservices run successfully using `docker-compose`

* GPU services use GPU
* CPU services use CPU
* All health checks pass

### ✔ Orchestrator can process an audio file end-to-end (mock mode)

### ✔ Orchestrator can process an audio file with *real models* (if GPU available)

### ✔ All OpenAPI specs are implemented

### ✔ All prompt templates integrated and used correctly by LLM microservice

### ✔ Tests:

* All unit tests pass
* All integration tests pass
* Orchestrator mock mode test passes
* Sample audio test executes without crashing

### ✔ Developer documentation is updated:

* README.md
* Setup instructions
* API usage instructions

### ✔ Code quality:

* Type hints
* Logging
* Clean folder structure
* Modular services

---

## **6. Developer Workflow Summary**

The expected workflow:

1. Review architecture diagram
2. Review folder structure document
3. Review docker-compose & GPU setup document
4. Start building microservices in order:

   * ASR
   * Alignment
   * Phoneme Map
   * Phoneme Diff
   * TTS
   * Voice Conversion
   * LLM Feedback
   * Orchestrator
5. Add mock mode
6. Build tests
7. Verify API Gateway (NodeJS) can communicate with Orchestrator
8. End-to-end validation
9. Final cleanup & documentation

---

## **7. Deliverables**

Your final deliverable is:

### **A complete multi-microservice backend system** that:

#### 1. Runs end-to-end inside Docker

#### 2. Accepts audio and outputs structured JSON + audio URLs

#### 3. Implements all APIs as per OpenAPI specs

#### 4. Integrates LLM feedback using the provided prompt templates

#### 5. Passes all tests

#### 6. Includes clean developer documentation

---

## **8. After Completion (Optional)**

Once this system is delivered, the next phase will be:

* Integration with the full NodeJS Express backend
* Frontend React UI development
* Adding analytics + dashboard
* Deploying to GPU cloud infrastructure
