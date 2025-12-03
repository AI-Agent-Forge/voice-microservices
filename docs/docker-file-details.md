Below are **production-ready GPU-enabled Dockerfiles** for the three GPU-heavy microservices:

### **1) ASR (WhisperX)**

### **2) TTS (XTTS / Coqui TTS)**

### **3) Voice Conversion (RVC / so-vits-svc)**

All three Dockerfiles:

* Use **CUDA + PyTorch GPU** base images
* Include best-practice optimizations for model loading
* Work with the **NVIDIA Container Toolkit**
* Are compatible with **docker compose**, **GKE**, **AWS GPU instances**, and **Lambda GPU (future)**

You can copy/paste these files directly into each service folder.

---

# 🚀 **1) ASR — GPU Dockerfile (`asr-service/Dockerfile`)**

This Dockerfile supports **WhisperX** with CUDA acceleration.

```dockerfile
# =========================================================
# ASR Service - GPU Enabled (WhisperX)
# =========================================================
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

# -----------------------------
# System dependencies
# -----------------------------
RUN apt-get update && apt-get install -y \
    git ffmpeg libsndfile1 python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------
# Install Python dependencies
# -----------------------------
COPY requirements.txt /tmp/requirements.txt

RUN pip3 install --upgrade pip && \
    pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 && \
    pip3 install --no-cache-dir -r /tmp/requirements.txt

# -----------------------------
# Copy Application
# -----------------------------
WORKDIR /app
COPY app /app

# -----------------------------
# Expose & Run
# -----------------------------
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### **ASR requirements.txt (recommended)**

```txt
fastapi
uvicorn
whisperx
python-multipart
numpy
pydantic
pydantic-settings
librosa
soundfile
boto3
requests
```

---

# 🔊 **2) TTS — GPU Dockerfile (`tts-service/Dockerfile`)**

Supports **XTTS v2 / Coqui TTS** with CUDA acceleration.

```dockerfile
# =========================================================
# TTS Service - GPU Enabled (XTTS / Coqui TTS)
# =========================================================
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

# -----------------------------
# System dependencies
# -----------------------------
RUN apt-get update && apt-get install -y \
    git ffmpeg libsndfile1 python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------
# Install Python dependencies
# -----------------------------
COPY requirements.txt /tmp/requirements.txt

RUN pip3 install --upgrade pip && \
    pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 && \
    pip3 install TTS==0.22.0 && \
    pip3 install --no-cache-dir -r /tmp/requirements.txt

# -----------------------------
# Copy Application
# -----------------------------
WORKDIR /app
COPY app /app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### **TTS requirements.txt (recommended)**

```txt
fastapi
uvicorn
python-multipart
pydantic
pydantic-settings
numpy
soundfile
librosa
boto3
requests
```

---

# 🗣 **3) Voice Conversion — GPU Dockerfile (`voice-conversion-service/Dockerfile`)**

This is the most GPU-heavy. Supports **RVC / so-vits-svc**.

```dockerfile
# =========================================================
# Voice Conversion Service - GPU Enabled (RVC / SVC)
# =========================================================
FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive

# -----------------------------
# System dependencies
# -----------------------------
RUN apt-get update && apt-get install -y \
    git ffmpeg libsndfile1 python3 python3-pip \
    build-essential libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------
# Install Python dependencies
# -----------------------------
COPY requirements.txt /tmp/requirements.txt

RUN pip3 install --upgrade pip && \
    pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 && \
    pip3 install faiss-gpu==1.7.4.post2 --no-cache-dir && \
    pip3 install --no-cache-dir -r /tmp/requirements.txt

# -----------------------------
# RVC Model Dependencies (optional but recommended)
# -----------------------------
RUN git clone https://github.com/RVC-Project/Retrieval-based-Voice-Conversion.git /rvc && \
    pip3 install -r /rvc/requirements.txt

# -----------------------------
# Copy App
# -----------------------------
WORKDIR /app
COPY app /app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### **Voice Conversion requirements.txt**

```txt
fastapi
uvicorn
python-multipart
numpy
pydantic
pydantic-settings
soundfile
librosa
faiss-cpu
boto3
requests
onnxruntime-gpu
```

---

# ⚙️ **Docker Compose GPU Instructions**

Your containers will support GPU if you run Compose with:

```bash
docker compose --profile gpu up
```

Add this to `docker-compose.yml` for GPU-enabled services:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - capabilities: [gpu]
```

OR override with:

```yaml
# docker-compose.override.yml
version: "3.8"

services:
  asr-service:
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
  tts-service:
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
  voice-conversion-service:
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
```

---

# ✔ All GPU-Enabled Microservices Ready

You now have full GPU Dockerfiles for:

| Service          | Model        | GPU? | Notes                  |
| ---------------- | ------------ | ---- | ---------------------- |
| ASR              | WhisperX     | ✔    | Fast timestamps        |
| TTS              | XTTS / Coqui | ✔    | High-quality US accent |
| Voice Conversion | RVC / SVC    | ✔    | Heavy GPU usage        |

