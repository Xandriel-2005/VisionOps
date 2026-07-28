from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.sql import func

from app.database import get_db
from app.models.gpu_profile import RemoteGPUProfile
from app.schemas.gpu_profile import GPUProfileCreate, GPUProfileUpdate, GPUProfileResponse

router = APIRouter(prefix="/api/gpu-profiles", tags=["GPU Profiles"])


@router.post("", response_model=GPUProfileResponse, status_code=201)
async def create_profile(payload: GPUProfileCreate, db: AsyncSession = Depends(get_db)):
    profile = RemoteGPUProfile(**payload.model_dump())
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return profile


@router.get("", response_model=list[GPUProfileResponse])
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(RemoteGPUProfile).order_by(RemoteGPUProfile.last_used_at.desc().nullslast())
    )
    return result.scalars().all()


@router.get("/{profile_id}", response_model=GPUProfileResponse)
async def get_profile(profile_id: int, db: AsyncSession = Depends(get_db)):
    profile = await db.get(RemoteGPUProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="GPU profile not found")
    return profile


@router.put("/{profile_id}", response_model=GPUProfileResponse)
async def update_profile(
    profile_id: int,
    payload: GPUProfileUpdate,
    db: AsyncSession = Depends(get_db),
):
    profile = await db.get(RemoteGPUProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="GPU profile not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.flush()
    await db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: int, db: AsyncSession = Depends(get_db)):
    profile = await db.get(RemoteGPUProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="GPU profile not found")
    await db.delete(profile)
