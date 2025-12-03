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

