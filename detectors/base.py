from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
import os


class BaseDetector(ABC):
    """
    Abstract Base Class for all object detection model adapters.
    Any new framework (Ultralytics, HuggingFace, Custom) must implement this interface
    to be auto-discovered by the VisionOps registry.
    """

    @abstractmethod
    def load(self, weights_path: Optional[str] = None) -> None:
        """
        Load the model into memory.
        If weights_path is None, load the default/pretrained base model.
        """
        pass

    @abstractmethod
    def train(
        self,
        dataset_path: str,
        epochs: int,
        batch_size: int,
        learning_rate: float,
        img_size: int,
        device: str = "",
        project_dir: str = "runs/train",
        name: str = "exp",
    ) -> Dict[str, Any]:
        """
        Run the training loop for the model.
        Must return a dictionary containing training metrics (e.g., mAP, loss).
        """
        pass

    @abstractmethod
    def infer(self, source_path: str, conf_threshold: float = 0.25) -> List[Dict[str, Any]]:
        """
        Run inference on an image or video frame.
        Must return a list of detections in a standard format:
        [
            {
                "bbox": [x1, y1, x2, y2],
                "confidence": float,
                "class_id": int,
                "class_name": str
            }, ...
        ]
        """
        pass

    @classmethod
    @abstractmethod
    def get_metadata(cls) -> List[Dict[str, Any]]:
        """
        Return a list of metadata dictionaries for the models supported by this adapter.
        Each dictionary should have:
        {
            "name": str (e.g. "yolov8n"),
            "display_name": str,
            "description": str,
            "parameters": str (e.g. "3.2M"),
            "speed": str (e.g. "High"),
            "accuracy": str (e.g. "Low")
        }
        """
        pass
