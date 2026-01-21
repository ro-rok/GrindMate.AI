"""
Pattern mapping API endpoints.
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict
from pydantic import BaseModel

from app.services.pattern_service import get_pattern_service

router = APIRouter(prefix="/patterns", tags=["patterns"])


class PatternInfo(BaseModel):
    """Pattern information model."""
    name: str
    description: str


class PatternDerivationRequest(BaseModel):
    """Request model for pattern derivation."""
    topics: str


class PatternDerivationResponse(BaseModel):
    """Response model for pattern derivation."""
    topics: str
    patterns: List[str]


class ConfigInfoResponse(BaseModel):
    """Response model for config information."""
    version: str
    last_loaded: str | None
    topic_count: int
    pattern_count: int
    config_path: str


@router.get("/", response_model=List[PatternInfo])
async def get_all_patterns():
    """
    Get all available patterns with descriptions.
    
    Returns:
        List of patterns with names and descriptions
    """
    pattern_service = get_pattern_service()
    return pattern_service.get_all_patterns()


@router.post("/derive", response_model=PatternDerivationResponse)
async def derive_patterns(request: PatternDerivationRequest):
    """
    Derive patterns from comma-separated topics.
    
    Args:
        request: Contains topics string (e.g., "array,hash-table,two-pointers")
    
    Returns:
        Original topics and derived patterns
    """
    pattern_service = get_pattern_service()
    patterns = pattern_service.derive_patterns(request.topics)
    
    return PatternDerivationResponse(
        topics=request.topics,
        patterns=patterns
    )


@router.get("/info", response_model=ConfigInfoResponse)
async def get_config_info():
    """
    Get information about the current pattern configuration.
    
    Returns:
        Config version, load time, and counts
    """
    pattern_service = get_pattern_service()
    return pattern_service.get_config_info()


@router.post("/reload")
async def reload_config():
    """
    Manually trigger a config reload (useful in development).
    
    Returns:
        Success message and reload status
    """
    pattern_service = get_pattern_service()
    reloaded = pattern_service.reload_if_modified()
    
    if reloaded:
        return {
            "message": "Pattern config reloaded successfully",
            "reloaded": True,
            "info": pattern_service.get_config_info()
        }
    else:
        return {
            "message": "Pattern config is up to date",
            "reloaded": False,
            "info": pattern_service.get_config_info()
        }
