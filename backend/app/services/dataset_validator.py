import os
from typing import Dict, Any, Tuple
import yaml


def validate_dataset(path: str) -> Dict[str, Any]:
    """
    Validates a dataset structure and returns stats.
    Expected structure (Ultralytics standard):
    - data.yaml (must have train, val, nc, names)
    - images/train/
    - images/val/
    - labels/train/
    - labels/val/
    """
    result = {
        "valid": False,
        "errors": [],
        "warnings": [],
        "summary": None
    }
    
    if not os.path.exists(path):
        result["errors"].append(f"Path does not exist: {path}")
        return result
        
    yaml_path = os.path.join(path, "data.yaml")
    if not os.path.exists(yaml_path):
        result["errors"].append(f"data.yaml not found in {path}")
        return result
        
    try:
        with open(yaml_path, 'r') as f:
            data = yaml.safe_load(f)
    except Exception as e:
        result["errors"].append(f"Failed to parse data.yaml: {str(e)}")
        return result
        
    required_keys = ['train', 'val', 'nc', 'names']
    for key in required_keys:
        if key not in data:
            result["errors"].append(f"Missing '{key}' in data.yaml")
            
    if result["errors"]:
        return result
        
    # Check if image directories exist (relative to yaml or absolute)
    # Simple check for now
    images_dir = os.path.join(path, "images")
    labels_dir = os.path.join(path, "labels")
    
    if not os.path.exists(images_dir):
        result["warnings"].append("images/ folder not found. Assumed to be configured accurately in yaml.")
        
    # Mocking stats for scaffold
    result["valid"] = True
    result["summary"] = {
        "total_images": 1205,
        "total_labels": 3402,
        "classes": {name: (100 * (i+1)) for i, name in enumerate(data.get('names', []))},
        "sample_images": []
    }
    
    return result
