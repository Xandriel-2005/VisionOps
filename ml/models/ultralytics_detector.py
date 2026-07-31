from ultralytics import YOLO, RTDETR
from .base_detector import BaseDetector
import os


# Map model-name prefixes to their Ultralytics class.
# Everything not matched here falls back to YOLO (covers v5, v8, v9, v10, v11, etc.)
_MODEL_CLASS = {
    "rtdetr": RTDETR,
}


class UltralyticsDetector(BaseDetector):
   

    REGISTRY_NAME = "ultralytics_detector"

    def __init__(self):
        self.model = None
        self.results = None
        self._weights_path = None

    def load(self, weights: str):
        self._weights_path = weights
        basename = os.path.basename(weights).lower()

        # Pick RTDETR class for rtdetr-* models, YOLO for everything else
        model_cls = YOLO
        for prefix, cls in _MODEL_CLASS.items():
            if basename.startswith(prefix):
                model_cls = cls
                break

        self.model = model_cls(weights)
        return self

    def train(self, dataset_yaml: str, **kwargs) -> dict:
        callbacks = kwargs.pop("callbacks", [])
        for cb in callbacks:
            if hasattr(cb, "on_epoch_end"):
                def wrapper(trainer, cb_instance=cb):
                    epoch = trainer.epoch + 1
                    metrics = trainer.metrics if hasattr(trainer, "metrics") else {}
                    cb_instance.on_epoch_end(epoch, metrics)
                self.model.add_callback("on_train_epoch_end", wrapper)

        self.results = self.model.train(data=dataset_yaml, **kwargs)
        return self._extract_metrics()

    def get_best_weights_path(self) -> str:
        return os.path.join(str(self.results.save_dir), "weights", "best.pt")

    def get_metadata(self) -> dict:
        return {
            "arch": os.path.basename(self._weights_path),
            "framework": "ultralytics",
            "task": "object_detection",
        }

    def _extract_metrics(self) -> dict:
        m = self.results.results_dict
        return {
            "mAP50":     round(m.get("metrics/mAP50(B)",    0), 4),
            "mAP50_95":  round(m.get("metrics/mAP50-95(B)", 0), 4),
            "precision": round(m.get("metrics/precision(B)", 0), 4),
            "recall":    round(m.get("metrics/recall(B)",    0), 4),
            "box_loss":  round(m.get("train/box_loss", 0), 4),
            "cls_loss":  round(m.get("train/cls_loss", 0), 4),
        }

    def infer(self, source_path: str, conf_threshold: float = 0.25) -> list[dict]:
        if not self.model:
            raise RuntimeError("Model not loaded.")
        results = self.model(source_path, conf=conf_threshold)
        detections = []
        for r in results:
            boxes = r.boxes
            for i in range(len(boxes)):
                b = boxes[i]
                conf = float(b.conf[0])
                cls_id = int(b.cls[0])
                cls_name = self.model.names[cls_id]
                x1, y1, x2, y2 = b.xyxy[0].tolist()
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "confidence": conf,
                    "class_id": cls_id,
                    "class_name": cls_name
                })
        return detections
