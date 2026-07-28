from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List

from app.services.dataset_validator import validate_dataset

router = APIRouter(prefix="/api/dataset", tags=["Dataset"])


class ValidateRequest(BaseModel):
    path: str


@router.post("/validate")
async def validate_dataset_endpoint(payload: ValidateRequest):
    """Validates the structure of a dataset path and returns summary stats."""
    return validate_dataset(payload.path)
