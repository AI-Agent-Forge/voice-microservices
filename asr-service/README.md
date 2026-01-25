# 🎤 ASR Service - Automatic Speech Recognition

## Overview

The ASR (Automatic Speech Recognition) Service provides audio transcription with word-level timestamps using WhisperX. It's optimized for GPU acceleration but supports CPU fallback.

## Features

- ✅ Audio transcription using WhisperX
- ✅ Word-level timestamps with high accuracy
- ✅ Support for multiple audio formats (wav, mp3, m4a, webm, ogg, flac)
- ✅ Both file upload and URL-based processing
- ✅ GPU acceleration (CUDA) with CPU fallback
- ✅ Multiple model sizes (tiny → large-v3)
- ✅ Configurable via environment variables
- ✅ Production-ready with structured logging

## API Endpoints

| Endpoint          | Method | Description                 |
| ----------------- | ------ | --------------------------- |
| `/health`         | GET    | Basic health check          |
| `/process/`       | POST   | Process uploaded audio file |
| `/process/url`    | POST   | Process audio from URL      |
| `/process/health` | GET    | Detailed health check       |
| `/process/info`   | GET    | Service configuration info  |

## Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit as needed (especially WHISPER_MODEL based on your GPU memory)
```

### 2. Run with Docker Compose (Recommended)

```bash
# From the root voice-microservices directory
docker-compose up asr-service -d

# View logs
docker-compose logs -f asr-service
```

### 3. Run Locally (Development)

```bash
cd asr-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118  # For GPU
# OR
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu  # For CPU

pip install -r requirements.txt

# Run the service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

## API Usage

### Transcribe Uploaded Audio

```bash
curl -X POST "http://localhost:8001/process/" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/audio.wav" \
  -F "language=en"
```

### Transcribe Audio from URL

```bash
curl -X POST "http://localhost:8001/process/url" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://example.com/audio.wav",
    "language": "en"
  }'
```

### Response Format

```json
{
  "transcript": "Hello, this is a test recording.",
  "words": [
    {"word": "Hello", "start": 0.0, "end": 0.5, "confidence": 0.98},
    {"word": "this", "start": 0.6, "end": 0.8, "confidence": 0.95}
  ],
  "segments": [...],
  "language": "en",
  "duration": 2.5,
  "model_used": "base",
  "processing_time": 1.23
}
```

## Configuration

### Environment Variables

| Variable                     | Default   | Description                                               |
| ---------------------------- | --------- | --------------------------------------------------------- |
| `WHISPER_MODEL`              | `base`    | Model size: tiny, base, small, medium, large-v2, large-v3 |
| `WHISPER_COMPUTE_TYPE`       | `float16` | Compute type: float16 (GPU), int8 (CPU)                   |
| `WHISPER_BATCH_SIZE`         | `16`      | Batch size (reduce if OOM)                                |
| `WHISPER_LANGUAGE`           | `en`      | Default language (None for auto-detect)                   |
| `MOCK_MODE`                  | `false`   | Enable mock mode for testing                              |
| `MAX_AUDIO_DURATION_SECONDS` | `600`     | Max audio length (10 min)                                 |

### Model Selection Guide

| Model    | VRAM Required | Speed   | Accuracy  |
| -------- | ------------- | ------- | --------- |
| tiny     | ~1 GB         | Fastest | Basic     |
| base     | ~1 GB         | Fast    | Good      |
| small    | ~2 GB         | Medium  | Better    |
| medium   | ~5 GB         | Slow    | Very Good |
| large-v2 | ~10 GB        | Slowest | Excellent |
| large-v3 | ~10 GB        | Slowest | Best      |

## Project Structure

```
asr-service/
├── app/
│   ├── main.py              # FastAPI application
│   ├── api/
│   │   └── endpoints.py     # API routes
│   ├── core/
│   │   └── config.py        # Configuration settings
│   ├── schemas/
│   │   └── request_response.py  # Pydantic models
│   └── services/
│       └── logic.py         # WhisperX transcription logic
├── training/
│   ├── data/               # Training data (if fine-tuning)
│   └── outputs/            # Model outputs
├── Dockerfile              # GPU-enabled Dockerfile
├── Dockerfile.cpu          # CPU-only Dockerfile
├── requirements.txt        # Python dependencies
├── .env.example           # Environment template
└── README.md              # This file
```

## Troubleshooting

### Common Issues

1. **Out of Memory (OOM)**

   - Reduce `WHISPER_BATCH_SIZE` to 8 or 4
   - Use a smaller model (tiny or base)

2. **Model Download Fails**

   - Check internet connection
   - Set `HF_TOKEN` if accessing gated models

3. **No GPU Detected**

   - Ensure NVIDIA drivers are installed
   - Check `nvidia-smi` works
   - Verify Docker has GPU access

4. **Slow Transcription**
   - Confirm GPU is being used (check logs)
   - Use a smaller model for faster processing

### Debug Mode

Enable debug mode for more verbose logging:

```bash
DEBUG=true uvicorn app.main:app --reload
```

## Next Steps

After ASR processing, the transcript goes to:

1. **Alignment Service** - For phoneme-level alignment
2. **Phoneme Map Service** - For target pronunciation lookup
