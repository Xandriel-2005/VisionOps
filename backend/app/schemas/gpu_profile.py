from pydantic import BaseModel, Field
from datetime import datetime


class GPUProfileCreate(BaseModel):
    name: str = Field(..., max_length=100, examples=["Lab GPU"])
    host: str = Field(..., max_length=255, examples=["192.168.1.100"])
    port: int = Field(default=22, ge=1, le=65535)
    username: str = Field(..., max_length=100, examples=["ubuntu"])
    ssh_key_path: str = Field(..., examples=["~/.ssh/id_rsa"])


class GPUProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    host: str | None = Field(default=None, max_length=255)
    port: int | None = Field(default=None, ge=1, le=65535)
    username: str | None = Field(default=None, max_length=100)
    ssh_key_path: str | None = None


class GPUProfileResponse(BaseModel):
    id: int
    name: str
    host: str
    port: int
    username: str
    ssh_key_path: str
    created_at: datetime
    last_used_at: datetime | None

    model_config = {"from_attributes": True}
