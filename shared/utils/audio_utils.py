import os
import uuid
import tempfile
from typing import Optional
from fastapi import UploadFile


def save_temp_audio(file: UploadFile, dir: Optional[str] = None) -> str:
    target_dir = dir or tempfile.gettempdir()
    name = uuid.uuid4().hex + "_" + (file.filename or "audio.wav")
    path = os.path.join(target_dir, name)
    with open(path, "wb") as f:
        f.write(file.file.read())
    return path

