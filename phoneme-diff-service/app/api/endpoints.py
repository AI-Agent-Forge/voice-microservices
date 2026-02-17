from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from app.services.logic import run_service_logic
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class DiffRequest(BaseModel):
    """Request model for phoneme comparison."""
    user_phonemes: Dict[str, List[str]] = Field(
        ..., 
        description="User-produced phonemes keyed by word",
        example={"hello": ["HH", "AA", "L", "O"]}
    )
    target_phonemes: Dict[str, List[str]] = Field(
        ..., 
        description="Target (CMUdict) phonemes keyed by word",
        example={"hello": ["HH", "AH", "L", "OW"]}
    )


class IssueDetail(BaseModel):
    """Detailed information about a phoneme mismatch."""
    type: str
    pattern: str
    user_phoneme: Optional[str] = None
    target_phoneme: Optional[str] = None
    position: int
    description: str


class ComparisonResult(BaseModel):
    """Comparison result for a single word."""
    word: str
    user: List[str]
    target: List[str]
    issue: str
    severity: str
    notes: str
    details: List[IssueDetail] = []


class DiffResponse(BaseModel):
    """Response model with comparison results."""
    comparisons: List[ComparisonResult] = Field(
        ..., 
        description="List of word-level comparison results"
    )


@router.post(
    "/process",
    response_model=DiffResponse,
    summary="Compare User vs Target Phonemes",
    description="Compare user-produced phonemes against target (CMUdict) phonemes to identify pronunciation issues"
)
async def diff_phonemes(req: DiffRequest) -> DiffResponse:
    """
    Compare user phonemes against target phonemes.
    
    Identifies issues like:
    - Vowel shifts (e.g., AA vs AH)
    - Consonant errors (e.g., V vs W)
    - Missing or extra phonemes
    
    Returns severity-scored comparison results.
    """
    try:
        return await run_service_logic(req)
    except Exception as e:
        logger.error(f"Phoneme diff failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

