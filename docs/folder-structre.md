Below is a **complete folder structure scaffolding** for the `agentforge-voice-microservices` repository, including **all microservices**, **boilerplate FastAPI code**, **starter Dockerfiles**, **shared utilities**, and **basic tests**.

You can paste this directly into your GitHub repo as the initial project structure.

---

# ⭐ **Repository Structure Overview**

```
agentforge-voice-microservices/
│
├── asr-service/
├── alignment-service/
├── phoneme-map-service/
├── phoneme-diff-service/
├── tts-service/
├── voice-conversion-service/
├── feedback-llm-service/
├── pipeline-orchestrator/
│
├── shared/
│   ├── config/
│   ├── storage/
│   ├── logging/
│   ├── models/
│   └── utils/
│
├── docs/
│
├── tests/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

# 📁 **1. Microservice Directory Structure (For Every Service)**

Each microservice follows this structure:

```
<service-name>/
│
├── app/
│   ├── main.py
│   ├── api/
│   │   └── endpoints.py
│   ├── core/
│   │   ├── config.py
│   │   └── model_loader.py
│   ├── services/
│   │   └── logic.py
│   ├── schemas/
│   │   └── request_response.py
│   └── utils/
│       └── audio.py
│
├── requirements.txt
├── Dockerfile
└── README.md
```

---

# 📁 **2. Boilerplate Files for Each Microservice**

## **🔹 main.py**

```python
from fastapi import FastAPI
from app.api.endpoints import router

app = FastAPI(title="ASR Service", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(router, prefix="/process")
```

---

## **🔹 endpoints.py**

```python
from fastapi import APIRouter, UploadFile, File
from app.services.logic import run_service_logic
from app.schemas.request_response import ASRResponse

router = APIRouter()

@router.post("/", response_model=ASRResponse)
async def process_audio(file: UploadFile = File(...)):
    result = await run_service_logic(file)
    return result
```

---

## **🔹 request_response.py**

```python
from pydantic import BaseModel
from typing import List

class Word(BaseModel):
    word: str
    start: float
    end: float

class ASRResponse(BaseModel):
    transcript: str
    words: List[Word]
    language: str
```

---

## **🔹 logic.py (placeholder)**

*(Engineering team will replace logic with actual model code)*

```python
import uuid
from app.utils.audio import save_temp_audio

async def run_service_logic(file):
    path = save_temp_audio(file)

    # Placeholder — implement WhisperX logic here
    return {
        "transcript": "Hello world",
        "words": [
            {"word": "Hello", "start": 0.0, "end": 0.4},
            {"word": "world", "start": 0.5, "end": 1.0},
        ],
        "language": "en"
    }
```

---

## **🔹 config.py**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    STORAGE_ENDPOINT: str = "http://minio:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"

    class Config:
        env_file = ".env"

settings = Settings()
```

---

## **🔹 Dockerfile (Template for all microservices)**

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY app app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## **🔹 requirements.txt (starter)**

```txt
fastapi
uvicorn
pydantic
pydantic-settings
numpy
librosa
python-multipart
boto3
requests
```

> For each microservice, add specific libraries like WhisperX, MFA, Coqui, RVC later.

---

---

# 📁 **3. Shared Library Folder Structure**

```
shared/
│
├── config/
│   └── loader.py
│
├── storage/
│   ├── minio_client.py
│   └── s3_utils.py
│
├── logging/
│   └── logger.py
│
├── models/
│   └── phoneme_rules.json
│
└── utils/
    ├── audio_utils.py
    ├── text_utils.py
    └── common.py
```

---

## 🔹 shared/config/loader.py

```python
from pydantic_settings import BaseSettings

class SharedSettings(BaseSettings):
    MINIO_ENDPOINT: str
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str

    class Config:
        env_file = ".env"

shared_settings = SharedSettings()
```

---

## 🔹 shared/storage/minio_client.py

```python
from minio import Minio
from shared.config.loader import shared_settings

client = Minio(
    endpoint=shared_settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=shared_settings.MINIO_ROOT_USER,
    secret_key=shared_settings.MINIO_ROOT_PASSWORD,
    secure=False
)
```

---

# 📁 **4. tests/ Structure**

```
tests/
│
├── test_asr.py
├── test_alignment.py
├── test_phonemap.py
├── test_phonemediff.py
└── test_tts.py
```

### Example test file:

```python
def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
```

---

# 📁 **5. docs/ Structure**

```
docs/
│
├── architecture.md
├── microservices.md
├── api_spec.md
└── onboarding.md
```

---

# 📁 **6. Root Files**

### **README.md**

```markdown
# AgentForge Voice Microservices

This repository hosts modular FastAPI-based microservices powering:

✔ Speech-to-Text (WhisperX)  
✔ Forced Alignment  
✔ Phoneme Mapping  
✔ Pronunciation Diff Engine  
✔ TTS (XTTS/Coqui)  
✔ Voice Conversion (RVC)  
✔ LLM-based Feedback  
✔ Pipeline Orchestrator  

Services are fully containerized and can run locally or in the cloud (AWS/GCP).

Run everything:
```

docker-compose up --build

```
```

---

### **.gitignore**

```
__pycache__/
*.pyc
.env
.env.*
/models_cache/
/tts_models/
/vc_models/
.idea/
.vscode/
```

---

### **.env.example**

```env
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=http://minio:9000

LLM_PROVIDER=openai
LLM_API_KEY=your-key-here
```
