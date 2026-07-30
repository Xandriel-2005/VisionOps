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
    models = list(registry.get_available_models())
    
    weights_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../models/weights"))
    if os.path.exists(weights_dir):
        registry_names = {m["name"] for m in models}
        for file in os.listdir(weights_dir):
            if file.endswith(".pt"):
                name = file[:-3]
                if name not in registry_names:
                    models.append({
                        "name": name,
                        "display_name": f"{file} (Custom Weights)",
                        "description": "Custom trained or uploaded weights.",
                        "parameters": "?",
                        "speed": "?",
                        "accuracy": "?",
                        "status": "ready",
                        "architecture": "Custom"
                    })
    return models

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
