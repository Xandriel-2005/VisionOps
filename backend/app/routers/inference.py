import os
import shutil
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from ml import model_registry

router = APIRouter(prefix="/api/inference", tags=["Inference"])

# Local temporary upload directory
UPLOAD_DIR = "/tmp/visionops_inference"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("")
async def run_inference(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    weights_path: str = Form(None),
    conf_threshold: float = Form(0.25)
):
    """
    Upload an image, run inference using the specified model/weights, and return detections.
    """
    # Save uploaded file temporarily
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    tmp_path = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")
    
    with open(tmp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        # Get detector
        try:
            # Default to ultralytics_detector if architecture isn't explicitly known.
            # In VisionOps, model_name often passes weights like yolov8n.pt from UI.
            detector = model_registry.get_detector("ultralytics_detector")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
            
        # Load weights (if provided, else uses base pretrained)
        try:
            detector.load(weights_path=weights_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load weights: {e}")
            
        # Run inference
        try:
            detections = detector.infer(source_path=tmp_path, conf_threshold=conf_threshold)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Inference failed: {e}")
            
        return JSONResponse(content={
            "status": "success",
            "model": model_name,
            "weights": weights_path or "pretrained",
            "detections": detections
        })
        
    finally:
        # Clean up tmp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
