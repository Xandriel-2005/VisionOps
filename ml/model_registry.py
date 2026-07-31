import importlib, inspect, os, pkgutil
from ml.models.base_detector import BaseDetector


def list_available() -> list[str]:
    """Return all registered architecture keys by scanning the models directory."""
    keys = []
    package_dir = os.path.join(os.path.dirname(__file__), "models")
    for info in pkgutil.iter_modules([package_dir]):
        if not info.name.startswith("_") and info.name != "base_detector":
            keys.append(info.name)
    return keys


def get_detector(arch: str) -> object:
    """Return a fresh detector instance. Lazily imports the heavy ML modules ONLY when needed."""
    try:
        module = importlib.import_module(f"ml.models.{arch}")
    except Exception as exc:
        raise ValueError(f"Unknown arch '{arch}' or failed to import: {exc}. Available: {list_available()}")

    for _, cls in inspect.getmembers(module, inspect.isclass):
        if issubclass(cls, BaseDetector) and cls is not BaseDetector:
            return cls()

    raise ValueError(f"No BaseDetector subclass found in ml.models.{arch}")