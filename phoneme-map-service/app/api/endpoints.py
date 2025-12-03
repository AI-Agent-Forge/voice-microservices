from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict
from app.services.logic import run_service_logic


router = APIRouter()


class MapRequest(BaseModel):
    words: List[str]


@router.post("/")
async def map_words(req: MapRequest) -> Dict[str, List[str]]:
    return await run_service_logic(req)

