from fastapi import APIRouter, HTTPException
import os
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

@router.get("/browse")
async def browse_directory(path: str = ""):
    """Returns a list of subdirectories for the given path. Handles Windows drives if empty."""
    import sys
    
    # Restrict to workspace datasets folder since Airflow Docker only mounts this directory
    workspace_root = os.path.abspath(os.environ.get("HOST_PROJECT_ROOT", os.path.join(os.path.dirname(__file__), "..", "..", "..")))
    datasets_dir = os.path.join(workspace_root, "datasets")
    os.makedirs(datasets_dir, exist_ok=True)
    
    # If no path provided, default to the datasets directory
    if not path:
        path = datasets_dir
        
    # Security/Compatibility check: ensure path is inside workspace
    if not os.path.abspath(path).startswith(workspace_root):
        raise HTTPException(status_code=403, detail="Dataset must be located inside the VisionOps workspace folder (e.g. VisionOps/datasets) so that Docker can access it.")
        
    if not os.path.exists(path) or not os.path.isdir(path):
        raise HTTPException(status_code=404, detail="Directory not found")
        
    try:
        # Get only directories
        items = os.listdir(path)
        dirs = []
        for item in items:
            full_path = os.path.join(path, item)
            if os.path.isdir(full_path) and not item.startswith('.'):
                dirs.append(item)
        
        return {
            "current_path": os.path.abspath(path),
            "parent_path": os.path.abspath(os.path.join(path, os.pardir)) if path != os.path.abspath(os.path.join(path, os.pardir)) else "",
            "directories": sorted(dirs)
        }
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied to access this directory")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/browse-native")
async def browse_native():
    import subprocess
    import sys
    
    script = """
import tkinter as tk
from tkinter import filedialog
import sys
import os

root = tk.Tk()
root.withdraw()
root.attributes('-topmost', True)

if sys.platform == "win32":
    root.lift()
    root.focus_force()

folder = filedialog.askdirectory(title="Select YOLO Dataset Folder")
if folder:
    print(os.path.abspath(folder))
"""
    try:
        # Avoid command window popping up on Windows
        kwargs = {}
        if sys.platform == "win32":
            kwargs["creationflags"] = 0x08000000  # CREATE_NO_WINDOW
            
        result = subprocess.run(
            [sys.executable, "-c", script],
            capture_output=True,
            text=True,
            check=True,
            **kwargs
        )
        
        path = result.stdout.strip()
        return {"path": path}
    except Exception as e:
        print(f"Error opening native browser: {e}")
        return {"path": ""}

import shutil
import zipfile
from fastapi import UploadFile, File

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Uploads a ZIP file and extracts it to the datasets directory."""
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are supported for dataset uploads.")
        
    workspace_root = os.path.abspath(os.environ.get("HOST_PROJECT_ROOT", os.path.join(os.path.dirname(__file__), "../../..")))
    datasets_dir = os.path.join(workspace_root, "datasets")
    os.makedirs(datasets_dir, exist_ok=True)
    
    # Save the zip file temporarily
    tmp_zip = os.path.join(datasets_dir, file.filename)
    with open(tmp_zip, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Extract
    dataset_name = file.filename[:-4]
    extract_path = os.path.join(datasets_dir, dataset_name)
    os.makedirs(extract_path, exist_ok=True)
    
    try:
        with zipfile.ZipFile(tmp_zip, 'r') as zip_ref:
            zip_ref.extractall(extract_path)
    except zipfile.BadZipFile:
        os.remove(tmp_zip)
        raise HTTPException(status_code=400, detail="Invalid ZIP file.")
        
    # Clean up the zip file
    os.remove(tmp_zip)
    
    return {"status": "success", "path": extract_path, "name": dataset_name}

