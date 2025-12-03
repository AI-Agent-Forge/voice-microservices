from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.services.logic import run_service_logic


router = APIRouter()


class DiffItem(BaseModel):
    word: str
    user: List[str]
    target: List[str]


class DiffRequest(BaseModel):
    items: List[DiffItem]


@router.post("/")
async def diff(req: DiffRequest):
    return await run_service_logic(req)

