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
        
    airflow_tasks = []
    airflow_url = ""
    mlflow_url = ""
    airflow_status = "unknown"
    
    if run.airflow_dag_run_id:
        # Fetch current Airflow status
        status = await airflow.get_dag_run_status(run.airflow_dag_id, run.airflow_dag_run_id)
        if status:
            airflow_status = status
            if status != run.status:
                run.status = status
                await db.flush()
                
        # Fetch Airflow task instances
        airflow_tasks = await airflow.get_dag_run_tasks(run.airflow_dag_id, run.airflow_dag_run_id)
        
        # Construct Airflow URL
        airflow_url = f"http://localhost:8080/dags/{run.airflow_dag_id}/grid?dag_run_id={run.airflow_dag_run_id}"

    import asyncio
    experiment_runs = await asyncio.to_thread(mlflow_client.get_experiment_runs)
    
    metrics = {}
    metric_history = {}
    mlflow_run_id = None
    experiment_id = "1" # Assuming default experiment is 1
    
    for erun in experiment_runs:
        params_run_id = erun.get("params", {}).get("run_id")
        tags_run_id = erun.get("tags", {}).get("visionops_run_id")
        if str(run_id) in [params_run_id, tags_run_id]:
            metrics = erun.get("metrics", {})
            mlflow_run_id = erun.get("run_id")
            break

    if mlflow_run_id:
        # Fetch historical data for key metrics to plot them
        for key in ["val/mAP50-95", "metrics/mAP50-95_B_", "train/box_loss"]:
            if key in metrics:
                history = await asyncio.to_thread(mlflow_client.get_metric_history, mlflow_run_id, key)
                if history:
                    metric_history[key] = history
                    
        mlflow_url = f"http://localhost:5000/#/experiments/{experiment_id}/runs/{mlflow_run_id}"

    return {
        "run_id": run.id,
        "model_name": run.model_name,
        "status": airflow_status,
        "metrics": metrics,
        "metric_history": metric_history,
        "airflow_tasks": airflow_tasks,
        "airflow_url": airflow_url,
        "mlflow_url": mlflow_url
    }

@router.get("/{run_id}/tasks/{task_id}/logs")
async def get_task_logs(run_id: int, task_id: str, try_number: int = 1, db: AsyncSession = Depends(get_db)):
    """Fetch execution logs for a specific Airflow task."""
    run = await db.get(RunHistory, run_id)
    if not run or not run.airflow_dag_run_id:
        raise HTTPException(status_code=404, detail="Run or Airflow DAG run not found")
        
    try:
        log_content = await airflow.get_task_log(
            dag_id=run.airflow_dag_id,
            dag_run_id=run.airflow_dag_run_id,
            task_id=task_id,
            try_number=try_number
        )
        if log_content is None:
            raise HTTPException(status_code=404, detail="Logs not found for this task")
        return {"log": log_content}
    except Exception as e:
        print(f"Error fetching logs for {task_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch task logs")
