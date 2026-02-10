import os
import torch
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Service Info
    SERVICE_NAME: str = "alignment-service"
    SERVICE_VERSION: str = "1.0.0"
    
    # Environment - MOCK_MODE disabled by default for real alignment
    MOCK_MODE: bool = False
    
    # Device Configuration
    DEVICE: str = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Storage
    TEMP_DIR: str = "/tmp/alignment_temp"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Ensure temp directory exists
os.makedirs(settings.TEMP_DIR, exist_ok=True)

