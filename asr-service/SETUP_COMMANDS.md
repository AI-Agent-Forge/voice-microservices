# 🚀 ASR Service Fine-Tuning - Step-by-Step Commands

## What Was Updated

| File | Changes Made |
|------|-------------|
| `requirements.txt` | Updated with WhisperX, structured logging, and all necessary dependencies |
| `app/core/config.py` | Comprehensive configuration with model settings, GPU support, environment variables |
| `app/schemas/request_response.py` | Full request/response models with validation |
| `app/services/logic.py` | Production WhisperX implementation with alignment |
| `app/api/endpoints.py` | File upload + URL processing endpoints |
| `app/main.py` | FastAPI app with lifespan events and model preloading |
| `Dockerfile` | GPU-enabled Dockerfile with CUDA support |
| `Dockerfile.cpu` | CPU-only alternative |
| `.env.example` | Environment template |
| `README.md` | Complete service documentation |
| `docker-compose.yml` | Updated with GPU support and new env vars |
| `test_asr_service.py` | Test script for validation |

---

## 🖥️ Commands to Run (In Order)

### Step 1: Navigate to Project Directory
```powershell
cd C:\Users\hp\Desktop\voice\voice-microservices
```

### Step 2: Create Environment File (if not exists)
```powershell
# Copy the example env file
Copy-Item -Path "asr-service\.env.example" -Destination ".env" -ErrorAction SilentlyContinue
```

### Step 3: Check GPU Availability (Important!)
```powershell
# Check if NVIDIA GPU is available
nvidia-smi
```

If GPU is NOT available, set `MOCK_MODE=true` in `.env` file for testing.

### Step 4: Build the ASR Service
```powershell
# Build just the ASR service
docker-compose build asr-service
```

### Step 5: Start Required Infrastructure
```powershell
# Start Redis and MinIO first
docker-compose up -d redis minio
```

### Step 6: Start ASR Service
```powershell
# Start ASR service
docker-compose up -d asr-service

# Watch the logs to see model loading
docker-compose logs -f asr-service
```

### Step 7: Test the Service
```powershell
# Basic health check
curl http://localhost:8001/health

# Detailed health check
curl http://localhost:8001/process/health

# Service info
curl http://localhost:8001/process/info
```

### Step 8: Test with Audio File (if you have one)
```powershell
# Test file upload (replace with your audio file path)
curl -X POST "http://localhost:8001/process/" -F "file=@C:\path\to\audio.wav" -F "language=en"
```

### Step 9: View Logs
```powershell
# View ASR service logs
docker-compose logs -f asr-service
```

---

## 🔧 Troubleshooting Commands

### If GPU Not Detected
```powershell
# Check if Docker has GPU access
docker run --rm --gpus all nvidia/cuda:11.8-base-ubuntu22.04 nvidia-smi
```

### If Service Won't Start
```powershell
# Check container status
docker-compose ps

# Check for errors
docker-compose logs asr-service --tail=100
```

### Rebuild from Scratch
```powershell
# Stop everything
docker-compose down

# Remove old images
docker-compose rm -f asr-service
docker rmi voice-microservices_asr-service

# Rebuild
docker-compose build --no-cache asr-service
docker-compose up -d asr-service
```

### Run in Mock Mode (for Testing without GPU)
```powershell
# Set mock mode in environment
$env:ASR_MOCK_MODE="true"
docker-compose up -d asr-service
```

---

## 📊 Expected Output

### Health Check Response
```json
{
  "status": "ok",
  "service": "asr-service",
  "model_loaded": true
}
```

### Transcription Response
```json
{
  "transcript": "Hello, this is a test.",
  "words": [
    {"word": "Hello", "start": 0.0, "end": 0.5, "confidence": 0.98},
    {"word": "this", "start": 0.6, "end": 0.8, "confidence": 0.95}
  ],
  "language": "en",
  "duration": 2.5,
  "model_used": "base",
  "processing_time": 1.23
}
```

---

## ✅ Checklist Before Moving to Next Service

- [ ] ASR service builds successfully
- [ ] Health endpoint returns "ok"
- [ ] Model loads (or mock mode works)
- [ ] File upload transcription works
- [ ] Logs show no errors
- [ ] GPU is being used (if available)

---

## 🎯 Next Microservice: Alignment Service

After ASR is working, we'll fine-tune the Alignment Service which:
- Takes audio + transcript from ASR
- Produces phoneme-level timestamps
- Uses Montreal Forced Aligner (MFA) or WhisperX alignment
