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
    
    # If no path provided, return root drives (Windows) or root directory (Linux/Mac)
    if not path:
        if sys.platform == "win32":
            import string
            from ctypes import windll
            drives = []
            bitmask = windll.kernel32.GetLogicalDrives()
            for letter in string.ascii_uppercase:
                if bitmask & 1:
                    drives.append(f"{letter}:\\")
                bitmask >>= 1
            return {"current_path": "", "directories": drives}
        else:
            path = "/"
            
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
    """Opens a native OS folder picker dialog using tkinter and returns the selected path."""
    import tkinter as tk
    from tkinter import filedialog
    import threading
    
    result_path = ""
    
    def open_dialog():
        nonlocal result_path
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        
        # Bring to front on Windows
        import sys
        if sys.platform == "win32":
            root.lift()
            root.focus_force()
            
        folder_selected = filedialog.askdirectory(title="Select YOLO Dataset Folder")
        if folder_selected:
            # normalize path
            result_path = os.path.abspath(folder_selected)
            
        root.destroy()
        
    # Run tkinter in a separate thread so it doesn't block the asyncio event loop or clash with uvicorn thread
    thread = threading.Thread(target=open_dialog)
    thread.start()
    thread.join()
    
    return {"path": result_path}
