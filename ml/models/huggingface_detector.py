from .base_detector import BaseDetector
import os

class HuggingFaceDetector(BaseDetector):
    """
    A basic skeleton for Hugging Face transformer-based object detection models.
    Supports lazy loading of the transformers library.
    """
    
    REGISTRY_NAME = "huggingface_detector"
    
    def __init__(self):
        self.model = None
        self.processor = None
        self._model_id = None
        self._framework = "transformers"

    def load(self, weights: str):
        """
        weights can be a huggingface hub model ID (e.g. facebook/detr-resnet-50)
        or a local path.
        """
        self._model_id = weights
        try:
            from transformers import AutoImageProcessor, AutoModelForObjectDetection
            self.processor = AutoImageProcessor.from_pretrained(weights)
            self.model = AutoModelForObjectDetection.from_pretrained(weights)
        except ImportError:
            print("WARNING: transformers package is not installed.")
        except Exception as e:
            print(f"WARNING: failed to load HF model {weights}: {e}")
        return self

    def train(self, dataset_yaml: str, **kwargs) -> dict:
        """
        Training loop for HuggingFace models.
        Currently a skeleton.
        """
        try:
            from transformers import Trainer, TrainingArguments
        except ImportError:
            raise RuntimeError("transformers package is required for training HF models.")
            
        print("HF Training skeleton initialized.")
        # Here we would parse dataset_yaml, convert to HF Dataset, and run Trainer.
        
        return {
            "mAP50": 0.0,
            "mAP50_95": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "loss": 0.0,
        }

    def get_best_weights_path(self) -> str:
        # Skeleton implementation
        return "runs/hf_train/best_model"

    def get_metadata(self) -> dict:
        return {
            "arch": self._model_id if self._model_id else "unknown_hf_model",
            "framework": self._framework,
            "task": "object_detection",
        }

    def infer(self, source_path: str, conf_threshold: float = 0.25) -> list[dict]:
        """
        Inference loop for HuggingFace models.
        """
        if not self.model or not self.processor:
            raise RuntimeError("Model or processor not loaded.")
            
        try:
            import torch
            from PIL import Image
        except ImportError:
            raise RuntimeError("torch and PIL are required for inference.")
            
        image = Image.open(source_path).convert("RGB")
        inputs = self.processor(images=image, return_tensors="pt")
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            
        # Convert outputs to Pascal VOC format (xmin, ymin, xmax, ymax)
        target_sizes = torch.tensor([image.size[::-1]])
        results = self.processor.post_process_object_detection(
            outputs, target_sizes=target_sizes, threshold=conf_threshold
        )[0]
        
        detections = []
        for score, label, box in zip(results["scores"], results["labels"], results["boxes"]):
            box = [round(i, 2) for i in box.tolist()]
            detections.append({
                "bbox": box,
                "confidence": round(score.item(), 3),
                "class_id": label.item(),
                "class_name": self.model.config.id2label[label.item()]
            })
            
        return detections
