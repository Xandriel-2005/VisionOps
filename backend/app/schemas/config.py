from pydantic import BaseModel, Field
from datetime import datetime


# ---------- System defaults ----------
SYSTEM_DEFAULTS = {
    "model_name": "yolov8n",
    "dataset_path": "",
    "use_bg_injection": False,
    "bg_images_path": "",
    "epochs": 50,
    "batch_size": 16,
    "learning_rate": 0.01,
    "image_size": 640,
    "train_val_split": 0.8,
    "run_mode": "local",
    "remote_gpu_profile_id": None,
    "schedule_type": "immediate",
    "schedule_expression": None,
    "scheduled_for": None,
}


class ConfigUpdate(BaseModel):
    model_name: str = Field(..., max_length=50)
    dataset_path: str
    use_bg_injection: bool = False
    bg_images_path: str = ""
    epochs: int = Field(..., gt=0)
    batch_size: int = Field(..., gt=0)
    learning_rate: float = Field(..., gt=0.0)
    image_size: int = Field(..., gt=0)
    train_val_split: float = Field(..., gt=0.0, lt=1.0)
    run_mode: str = Field(..., pattern="^(local|remote)$")
    remote_gpu_profile_id: int | None = None
    schedule_type: str = Field(default="immediate", pattern="^(immediate|recurring|one_time_future)$")
    schedule_expression: str | None = None
    scheduled_for: datetime | None = None


class ConfigResponse(BaseModel):
    model_name: str
    dataset_path: str
    use_bg_injection: bool
    bg_images_path: str
    epochs: int
    batch_size: int
    learning_rate: float
    image_size: int
    train_val_split: float
    run_mode: str
    remote_gpu_profile_id: int | None
    schedule_type: str
    schedule_expression: str | None
    scheduled_for: datetime | None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
