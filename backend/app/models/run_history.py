from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Index
from sqlalchemy.sql import func
from app.models import Base


class RunHistory(Base):
    """One row per training run — the core tracking table.

    Stores a full config snapshot plus links to Airflow/MLflow run IDs
    (plain strings, not foreign keys — those live in separate databases).
    """

    __tablename__ = "run_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_name = Column(String(150), nullable=True)
    model_name = Column(String(50), nullable=False)
    dataset_path = Column(Text, nullable=False)
    dataset_version_tag = Column(String(100), nullable=True)
    use_bg_injection = Column(Boolean, nullable=False, default=False)
    bg_images_path = Column(Text, nullable=False, default="")
    epochs = Column(Integer, nullable=False)
    batch_size = Column(Integer, nullable=False)
    learning_rate = Column(Float, nullable=False)
    image_size = Column(Integer, nullable=False)
    train_val_split = Column(Float, nullable=False)
    run_mode = Column(String(20), nullable=False)  # 'local' or 'remote'
    remote_gpu_profile_id = Column(
        Integer,
        ForeignKey("remote_gpu_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    schedule_type = Column(String(20), nullable=False, default="immediate")  # 'immediate', 'recurring', 'one_time_future'
    schedule_expression = Column(String(100), nullable=True)  # cron expression, if recurring
    scheduled_for = Column(DateTime(timezone=True), nullable=True)  # if one_time_future
    airflow_dag_id = Column(String(150), nullable=False)
    airflow_dag_run_id = Column(String(150), nullable=True)
    mlflow_run_id = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # 'pending', 'running', 'success', 'failed', 'cancelled'
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("idx_run_history_status", "status"),
        Index("idx_run_history_created_at", "created_at"),
        Index("idx_run_history_model_name", "model_name"),
    )

    def __repr__(self) -> str:
        return f"<RunHistory(id={self.id}, name='{self.run_name}', status='{self.status}')>"
