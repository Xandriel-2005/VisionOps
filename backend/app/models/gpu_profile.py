from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.models import Base


class RemoteGPUProfile(Base):
    """Saved SSH connection details for remote GPU targets."""

    __tablename__ = "remote_gpu_profiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False, default=22)
    username = Column(String(100), nullable=False)
    ssh_key_path = Column(Text, nullable=False)
    venv_path = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<RemoteGPUProfile(id={self.id}, name='{self.name}', host='{self.host}')>"
