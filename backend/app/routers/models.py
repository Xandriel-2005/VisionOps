from fastapi import APIRouter
import sys
import os

# Add repo root to sys.path so we can import detectors module
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
from detectors.registry import registry

router = APIRouter(prefix="/api/models", tags=["Models"])

@router.get("")
async def list_models():
    """Returns the list of all available detector models and their metadata."""
    return registry.get_available_models()
