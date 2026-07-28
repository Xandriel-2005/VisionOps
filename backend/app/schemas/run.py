from pydantic import BaseModel, Field
from datetime import datetime


class RunCreate(BaseModel):
    run_name: str | None = Field(default=None, max_length=150)
    model_name: str = Field(..., max_length=50)
    dataset_path: str
    dataset_version_tag: str | None = None
    use_bg_injection: bool = False
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


class RunResponse(BaseModel):
    id: int
    run_name: str | None
    model_name: str
    dataset_path: str
    dataset_version_tag: str | None
    use_bg_injection: bool
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
    airflow_dag_id: str
    airflow_dag_run_id: str | None
    mlflow_run_id: str | None
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RunListParams(BaseModel):
    """Query parameters for listing runs."""
    status: str | None = None
    model_name: str | None = None
    sort_by: str = "created_at"
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$")
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
