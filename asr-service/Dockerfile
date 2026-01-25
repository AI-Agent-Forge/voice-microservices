# ASR Service Dockerfile - GPU Optimized
# Uses NVIDIA CUDA for GPU acceleration

# Use NVIDIA CUDA 12.1 base image for GPU support (required by ctranslate2/whisperx)
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3.10-venv \
    python3-pip \
    ffmpeg \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.10 /usr/bin/python

# Set working directory
WORKDIR /app

# Create cache directories
RUN mkdir -p /models_cache /tmp/asr_temp && chmod 777 /models_cache /tmp/asr_temp

# Copy requirements first for better caching
COPY requirements.txt requirements.txt

# Install PyTorch 2.5.1 with CUDA 12.1 support
RUN pip install --upgrade pip && \
    pip install torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu121

# Install remaining dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app app

# Create non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app /models_cache /tmp/asr_temp
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

