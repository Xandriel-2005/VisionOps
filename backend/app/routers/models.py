from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import shutil
import sys
import os

# Add repo root to sys.path so we can import ml module
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
sys.path.insert(0, REPO_ROOT)
from ml import model_registry

router = APIRouter(prefix="/api/models", tags=["Models"])

# Derive directories from REPO_ROOT — single source of truth
BASE_WEIGHTS_DIR = os.path.join(REPO_ROOT, "models", "weights")
TRAINED_WEIGHTS_DIR = os.path.join(REPO_ROOT, "models", "trained_weights")

VALID_EXTENSIONS = (".pt", ".onnx", ".tflite", ".safetensors")


@router.get("")
async def list_models():
    models = []

    # 1. Base models (pretrained)
    if os.path.exists(BASE_WEIGHTS_DIR):
        for file in os.listdir(BASE_WEIGHTS_DIR):
            if file.endswith(VALID_EXTENSIONS):
                models.append({
                    "name": file,
                    "display_name": file,
                    "description": "Base pretrained weights.",
                    "category": "Base Model",
                    "path": os.path.join(BASE_WEIGHTS_DIR, file),
                    "parameters": "?",
                    "speed": "?",
                    "accuracy": "?",
                    "status": "ready",
                    "architecture": "Base"
                })

    # 2. Trained models
    if os.path.exists(TRAINED_WEIGHTS_DIR):
        for file in os.listdir(TRAINED_WEIGHTS_DIR):
            if file.endswith(VALID_EXTENSIONS):
                models.append({
                    "name": file,
                    "display_name": file,
                    "description": "Custom trained weights.",
                    "category": "Trained Model",
                    "path": os.path.join(TRAINED_WEIGHTS_DIR, file),
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

    os.makedirs(BASE_WEIGHTS_DIR, exist_ok=True)
    file_path = os.path.join(BASE_WEIGHTS_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"status": "success", "filename": file.filename, "path": file_path}


@router.get("/{filename}/download")
async def download_model(filename: str):
    """Download a model weights file from either base or trained folders."""
    for directory in [TRAINED_WEIGHTS_DIR, BASE_WEIGHTS_DIR]:
        candidate = os.path.join(directory, filename)
        if os.path.exists(candidate):
            return FileResponse(path=candidate, filename=filename, media_type="application/octet-stream")

    raise HTTPException(status_code=404, detail="Model weights file not found.")
