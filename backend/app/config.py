from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    # ---------- Database ----------
    database_url: str = "postgresql+asyncpg://visionops:visionops_dev@localhost:5432/visionops"

    # ---------- Airflow ----------
    airflow_base_url: str = "http://localhost:8080"
    airflow_username: str = "airflow"
    airflow_password: str = "airflow"

    # ---------- MLflow ----------
    mlflow_tracking_uri: str = "http://localhost:5000"

    # ---------- Backend ----------
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
