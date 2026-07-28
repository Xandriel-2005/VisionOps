import os
from typing import Any, Dict, List, Optional
from ultralytics import YOLO
from detectors.base import BaseDetector


class UltralyticsDetector(BaseDetector):
    """
    Adapter for Ultralytics YOLO models (YOLOv8, YOLOv5, etc.).
    Uses the unified `ultralytics` package API.
    """

    def __init__(self, model_name: str = "yolov8n"):
        self.model_name = model_name
        self.model = None

    def load(self, weights_path: Optional[str] = None) -> None:
        """
        Load the Ultralytics model.
        If weights_path is provided, loads custom trained weights.
        Otherwise, loads the pretrained weights for the base model (e.g. yolov8n.pt).
        """
        path = weights_path if weights_path else f"{self.model_name}.pt"
        self.model = YOLO(path)

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
        Run Ultralytics YOLO training.
        """
        if self.model is None:
            self.load()

        results = self.model.train(
            data=dataset_path,
            epochs=epochs,
            batch=batch_size,
            lr0=learning_rate,
            imgsz=img_size,
            device=device,
            project=project_dir,
            name=name,
            exist_ok=True
        )
        
        # Results object in ultralytics contains various metrics
        # depending on the task. Extracting standard ones if available.
        metrics = {}
        if hasattr(results, 'results_dict'):
            # It's a dict containing keys like 'metrics/mAP50-95(B)', 'metrics/precision(B)'
            metrics = results.results_dict

        return metrics

    def infer(self, source_path: str, conf_threshold: float = 0.25) -> List[Dict[str, Any]]:
        """
        Run inference on an image.
        """
        if self.model is None:
            self.load()

        # Run inference
        results = self.model(source_path, conf=conf_threshold)
        
        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
                
            for box in boxes:
                # box.xyxy is tensor([x1, y1, x2, y2])
                xyxy = box.xyxy[0].cpu().numpy().tolist()
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())
                cls_name = result.names[cls_id]
                
                detections.append({
                    "bbox": xyxy,
                    "confidence": conf,
                    "class_id": cls_id,
                    "class_name": cls_name
                })
                
        return detections

    @classmethod
    def get_metadata(cls) -> List[Dict[str, Any]]:
        """
        Return metadata for supported Ultralytics models.
        """
        return [
            {
                "name": "yolov8n",
                "display_name": "YOLOv8 Nano",
                "description": "Fastest and smallest YOLOv8 model, ideal for edge devices.",
                "parameters": "3.2M",
                "speed": "Very High",
                "accuracy": "Moderate"
            },
            {
                "name": "yolov5n",
                "display_name": "YOLOv5 Nano",
                "description": "Legacy nano model, extremely lightweight.",
                "parameters": "1.9M",
                "speed": "Very High",
                "accuracy": "Low"
            }
        ]
