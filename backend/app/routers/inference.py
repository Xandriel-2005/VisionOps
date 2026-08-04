import os
import shutil
import uuid
import tempfile
import zipfile
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, FileResponse

import sys
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
sys.path.insert(0, REPO_ROOT)

from ml import model_registry

router = APIRouter(prefix="/api/inference", tags=["Inference"])

# Cross-platform temp directory
UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "visionops_inference")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _resolve_weights(weights_path: str | None, model_name: str) -> str:
    """Return an absolute path to the weights file.
    
    Priority:
      1. weights_path if it's already absolute and exists
      2. weights_path resolved relative to REPO_ROOT
      3. model_name as-is (Ultralytics will auto-download standard models like yolov8n.pt)
    """
    if weights_path:
        if os.path.isabs(weights_path) and os.path.exists(weights_path):
            return weights_path
        # Try relative to repo root
        candidate = os.path.join(REPO_ROOT, weights_path)
        if os.path.exists(candidate):
            return candidate
        # Path was given but not found — still pass it through (ultralytics may handle it)
        return weights_path

    return model_name


@router.post("")
async def run_inference(
    file: UploadFile = File(...),
    model_name: str = Form(...),
    weights_path: str = Form(None),
    conf_threshold: float = Form(0.25)
):
    """Upload an image, run inference, and return detections."""
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    tmp_path = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")

    with open(tmp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        detector = model_registry.get_detector("ultralytics_detector")
        resolved = _resolve_weights(weights_path, model_name)
        detector.load(resolved)
        detections = detector.infer(source_path=tmp_path, conf_threshold=conf_threshold)

        return JSONResponse(content={
            "status": "success",
            "model": model_name,
            "weights": resolved,
            "detections": detections
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/batch")
async def run_batch_inference(
    files: List[UploadFile] = File(...),
    model_name: str = Form(...),
    weights_path: str = Form(None),
    conf_threshold: float = Form(0.25)
):
    """Upload multiple images, run inference, return a zip of annotated images."""
    batch_id = str(uuid.uuid4())
    batch_dir = os.path.join(UPLOAD_DIR, batch_id)
    input_dir = os.path.join(batch_dir, "input")
    output_dir = os.path.join(batch_dir, "output")
    os.makedirs(input_dir, exist_ok=True)
    os.makedirs(output_dir, exist_ok=True)

    try:
        # Save all uploaded files
        for file in files:
            safe_filename = os.path.basename(file.filename)
            file_path = os.path.join(input_dir, safe_filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

        # Load detector + weights
        detector = model_registry.get_detector("ultralytics_detector")
        resolved = _resolve_weights(weights_path, model_name)
        detector.load(resolved)

        # Run inference
        detector.infer(source_path=input_dir, conf_threshold=conf_threshold, save_dir=output_dir)

        # Zip results
        zip_path = os.path.join(UPLOAD_DIR, f"{batch_id}.zip")
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, filenames in os.walk(output_dir):
                for fname in filenames:
                    fpath = os.path.join(root, fname)
                    arcname = os.path.relpath(fpath, output_dir)
                    zipf.write(fpath, arcname)

        return FileResponse(
            path=zip_path,
            filename=f"inference_results_{batch_id[:8]}.zip",
            media_type="application/zip"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
