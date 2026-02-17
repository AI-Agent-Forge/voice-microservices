from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
from app.services.logic import run_service_logic
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class MapRequest(BaseModel):
    """Request model for phoneme mapping."""
    words: List[str] = Field(..., description="List of words to map to phonemes")


class MapResponse(BaseModel):
    """Response model with word-to-phoneme mapping."""
    map: Dict[str, List[str]] = Field(..., description="Mapping of words to ARPAbet phoneme lists")


@router.post(
    "/process",
    response_model=MapResponse,
    summary="Map Words to Phonemes",
    description="Map a list of words to their canonical ARPAbet phoneme representations using CMUdict"
)
async def map_words(req: MapRequest) -> MapResponse:
    """
    Map words to their canonical ARPAbet phoneme representations.
    
    Uses CMUdict for known words and g2p_en for out-of-vocabulary words.
    
    Example:
        Input: {"words": ["hello", "world"]}
        Output: {"map": {"hello": ["HH", "AH", "L", "OW"], "world": ["W", "ER", "L", "D"]}}
    """
    try:
        return await run_service_logic(req)
    except Exception as e:
        logger.error(f"Phoneme mapping failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

