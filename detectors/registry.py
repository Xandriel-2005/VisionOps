import os
import importlib
import inspect
from typing import Dict, Any, List, Type
from detectors.base import BaseDetector


class ModelRegistry:
    """
    Auto-discovers and registers BaseDetector subclasses in the detectors directory.
    """
    
    def __init__(self):
        self._detectors: Dict[str, Type[BaseDetector]] = {}
        self._metadata: List[Dict[str, Any]] = []
        self._discover_models()
        
    def _discover_models(self):
        """Scans the detectors package for BaseDetector subclasses."""
        detectors_dir = os.path.dirname(__file__)
        
        for filename in os.listdir(detectors_dir):
            if filename.endswith(".py") and filename not in ("__init__.py", "base.py", "registry.py"):
                module_name = filename[:-3]
                
                # Import the module
                module = importlib.import_module(f"detectors.{module_name}")
                
                # Find BaseDetector subclasses
                for name, obj in inspect.getmembers(module, inspect.isclass):
                    if issubclass(obj, BaseDetector) and obj is not BaseDetector:
                        # Extract metadata
                        metadata_list = obj.get_metadata()
                        
                        for meta in metadata_list:
                            model_name = meta["name"]
                            self._detectors[model_name] = obj
                            self._metadata.append(meta)
                            
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Returns the list of all metadata for available models."""
        return self._metadata
        
    def get_detector_class(self, model_name: str) -> Type[BaseDetector]:
        """Returns the uninstantiated detector class for a given model name."""
        if model_name not in self._detectors:
            # Fallback to UltralyticsDetector for custom .pt weights
            from detectors.ultralytics_detector import UltralyticsDetector
            return UltralyticsDetector
        return self._detectors[model_name]
        
    def get_detector(self, model_name: str) -> BaseDetector:
        """Instantiates and returns the detector for a given model name."""
        detector_class = self.get_detector_class(model_name)
        # We pass model_name to the constructor because a single adapter might handle multiple variants
        return detector_class(model_name=model_name)

# Singleton instance
registry = ModelRegistry()
