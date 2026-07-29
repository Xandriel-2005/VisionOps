from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, asc

from app.database import get_db
from app.models.run_history import RunHistory
from app.models.last_config import LastUsedConfig
from app.schemas.run import RunCreate, RunResponse
from app.schemas.config import ConfigUpdate
from app.services.airflow_client import airflow

router = APIRouter(prefix="/api/runs", tags=["Runs"])

DAG_ID = "visionops_training"


@router.post("", response_model=RunResponse, status_code=201)
async def create_run(payload: RunCreate, db: AsyncSession = Depends(get_db)):
    """Create a new run record and trigger the corresponding Airflow DAG."""
    run = RunHistory(
        **payload.model_dump(),
        airflow_dag_id=DAG_ID,
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)
    
    # Trigger Airflow DAG
    dag_run_id = await airflow.trigger_dag(
        dag_id=DAG_ID,
        conf={
            "run_id": run.id,
            "model_name": run.model_name,
            "dataset_path": run.dataset_path,
            "epochs": run.epochs,
            "batch_size": run.batch_size,
            "learning_rate": run.learning_rate,
            "image_size": run.image_size
        }
    )
    
    if dag_run_id:
        run.airflow_run_id = dag_run_id
        await db.flush()
        
    return run


@router.get("", response_model=list[RunResponse])
async def list_runs(
    status: str | None = None,
    model_name: str | None = None,
    sort_by: str = Query(default="created_at", pattern="^(created_at|model_name|status)$"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List run history with filtering, sorting, and pagination."""
    query = select(RunHistory)

    if status:
        query = query.where(RunHistory.status == status)
    if model_name:
        query = query.where(RunHistory.model_name == model_name)

    sort_column = getattr(RunHistory, sort_by)
    query = query.order_by(desc(sort_column) if sort_order == "desc" else asc(sort_column))
    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{run_id}", response_model=RunResponse)
async def get_run(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(RunHistory, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.delete("/{run_id}", status_code=204)
async def delete_run(run_id: int, db: AsyncSession = Depends(get_db)):
    run = await db.get(RunHistory, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    await db.delete(run)


@router.post("/{run_id}/reload-config", status_code=200)
async def reload_config(run_id: int, db: AsyncSession = Depends(get_db)):
    """Copy a past run's config into last_used_config for reuse."""
    run = await db.get(RunHistory, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    config_data = {
        "model_name": run.model_name,
        "dataset_path": run.dataset_path,
        "use_bg_injection": run.use_bg_injection,
        "epochs": run.epochs,
        "batch_size": run.batch_size,
        "learning_rate": run.learning_rate,
        "image_size": run.image_size,
        "train_val_split": run.train_val_split,
        "run_mode": run.run_mode,
        "remote_gpu_profile_id": run.remote_gpu_profile_id,
    }

    result = await db.execute(select(LastUsedConfig).limit(1))
    config = result.scalar_one_or_none()

    if config:
        for field, value in config_data.items():
            setattr(config, field, value)
    else:
        config = LastUsedConfig(**config_data)
        db.add(config)

    await db.flush()
    return {"detail": "Config reloaded from run", "run_id": run_id}
