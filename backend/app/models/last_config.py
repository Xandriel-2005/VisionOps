from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.models import Base


class LastUsedConfig(Base):
    """Single-row table storing the most recent training configuration.

    Used to pre-fill the Config page on next launch. Intentionally separate
    from run_history so that deleting history entries doesn't affect pre-fill.
    """

    __tablename__ = "last_used_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(50), nullable=False)
    dataset_path = Column(Text, nullable=False)
    use_bg_injection = Column(Boolean, nullable=False, default=False)
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
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    def __repr__(self) -> str:
        return f"<LastUsedConfig(model='{self.model_name}', epochs={self.epochs})>"
