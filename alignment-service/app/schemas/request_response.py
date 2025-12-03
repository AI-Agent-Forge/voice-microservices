from pydantic import BaseModel
from typing import List


class Phoneme(BaseModel):
    symbol: str
    start: float
    end: float


class AlignmentResponse(BaseModel):
    phonemes: List[Phoneme]

