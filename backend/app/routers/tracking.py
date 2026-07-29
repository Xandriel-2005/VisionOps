from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.database import get_db
from app.models.run_history import RunHistory
from app.services.mlflow_client import mlflow_client
from app.services.airflow_client import airflow

router = APIRouter(prefix="/api/tracking", tags=["Tracking"])

@router.get("/{run_id}/live")
async def get_live_tracking(run_id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetches the live status from Airflow and live metrics from MLflow for a specific run.
    """
    run = await db.get(RunHistory, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    airflow_status = "unknown"
    if run.airflow_run_id:
        # Fetch current Airflow status
        status = await airflow.get_dag_run_status(run.airflow_dag_id, run.airflow_run_id)
        if status:
            airflow_status = status
            
            # If status changed, we could update the DB here, but for now we just return it
            if status != run.status:
                run.status = status
                await db.flush()

    # In a real app, the MLflow run ID would be mapped. We'll simulate fetching by generic run name for now.
    # Assuming MLflow run name matches our VisionOps run_id somehow, or we query by experiment
    # For scaffold, let's just use the mlflow_client to get generic experiment runs
    
    experiment_runs = mlflow_client.get_experiment_runs()
    
    # We try to find the MLflow run that matches our DB run ID
    # This assumes training script tags the MLflow run with visionops_run_id
    metrics = {}
    for erun in experiment_runs:
        if erun.get("params", {}).get("visionops_run_id") == str(run_id):
            metrics = erun.get("metrics", {})
            break

    return {
        "run_id": run.id,
        "model_name": run.model_name,
        "status": airflow_status,
        "metrics": metrics
    }
