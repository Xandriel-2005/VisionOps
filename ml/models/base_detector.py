
from abc import ABC, abstractmethod

class BaseDetector(ABC):
    """
    Every detection model must implement this interface.
    Swapping architectures = add a new file that subclasses this.
    """

    @abstractmethod
    def load(self, weights: str):
        """Load weights. weights can be a pretrained name or a .pt path."""
        pass

    @abstractmethod
    def train(self, dataset_yaml: str, **kwargs) -> dict:
        """Run training. Return a dict of final metrics. Kwargs may include 'resume'."""
        pass

    @abstractmethod
    def get_best_weights_path(self) -> str:
        """Return path to best.pt after training completes."""
        pass

    @abstractmethod
    def get_metadata(self) -> dict:
        """Return arch name, param count, or anything useful to log."""
        pass

    @abstractmethod
    def infer(self, source_path: str, conf_threshold: float = 0.25) -> list[dict]:
        """Run inference on an image or video frame."""
        pass