from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.last_config import LastUsedConfig
from app.schemas.config import ConfigUpdate, ConfigResponse, SYSTEM_DEFAULTS

router = APIRouter(prefix="/api/config", tags=["Configuration"])


@router.get("/defaults", response_model=ConfigResponse)
async def get_defaults():
    """Return hardcoded system defaults."""
    return ConfigResponse(**SYSTEM_DEFAULTS)


@router.get("/last-used", response_model=ConfigResponse)
async def get_last_used(db: AsyncSession = Depends(get_db)):
    """Return the last-used config, or system defaults if none saved."""
    result = await db.execute(select(LastUsedConfig).limit(1))
    config = result.scalar_one_or_none()
    if config:
        return config
    return ConfigResponse(**SYSTEM_DEFAULTS)


@router.put("/last-used", response_model=ConfigResponse)
async def save_last_used(payload: ConfigUpdate, db: AsyncSession = Depends(get_db)):
    """Save (upsert) the last-used config — overwrites the single row."""
    result = await db.execute(select(LastUsedConfig).limit(1))
    config = result.scalar_one_or_none()

    if config:
        for field, value in payload.model_dump().items():
            setattr(config, field, value)
    else:
        config = LastUsedConfig(**payload.model_dump())
        db.add(config)

    await db.flush()
    await db.refresh(config)
    return config
