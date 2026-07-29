from fastapi import APIRouter, UploadFile, File, HTTPException
import shutil
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

@router.post("/upload")
async def upload_custom_weights(file: UploadFile = File(...)):
    """Upload custom weights to be used as a base model."""
    if not file.filename.endswith('.pt'):
        raise HTTPException(status_code=400, detail="Only .pt weights are currently supported.")
        
    weights_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../models/weights"))
    os.makedirs(weights_dir, exist_ok=True)
    
    file_path = os.path.join(weights_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"status": "success", "filename": file.filename, "path": f"models/weights/{file.filename}"}
