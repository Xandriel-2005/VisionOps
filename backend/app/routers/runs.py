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

def _to_airflow_path(host_path: str) -> str:
    if not host_path:
        return host_path
    if host_path.startswith("/opt/airflow"):
        return host_path
    parts = host_path.replace("\\", "/").split("/")
    if "datasets" in parts:
        idx = parts.index("datasets")
        return "/opt/airflow/datasets/" + "/".join(parts[idx+1:])
    return host_path



@router.post("", response_model=RunResponse, status_code=201)
async def create_run(payload: RunCreate, db: AsyncSession = Depends(get_db)):
    run = RunHistory(**payload.model_dump())
    
    if payload.schedule_type == "immediate":
        run.airflow_dag_id = DAG_ID
        db.add(run)
        await db.flush()
        await db.refresh(run)
        
        # Build DAG conf
        dag_conf = {
            "run_id": run.id,
            "model_name": run.model_name,
            "dataset_path": _to_airflow_path(run.dataset_path),
            "epochs": run.epochs,
            "batch_size": run.batch_size,
            "learning_rate": run.learning_rate,
            "image_size": run.image_size,
            "use_bg_injection": run.use_bg_injection,
            "bg_images_path": _to_airflow_path(run.bg_images_path),
            "run_mode": run.run_mode,
        }
        
        # If remote GPU, look up the profile and attach SSH details
        if run.run_mode == "remote" and run.remote_gpu_profile_id:
            from app.models.gpu_profile import RemoteGPUProfile
            profile = await db.get(RemoteGPUProfile, run.remote_gpu_profile_id)
            if not profile:
                raise HTTPException(status_code=400, detail="Selected GPU profile not found.")
            dag_conf["gpu_host"] = profile.host
            dag_conf["gpu_port"] = profile.port
            dag_conf["gpu_user"] = profile.username
            dag_conf["gpu_ssh_key_path"] = profile.ssh_key_path
            dag_conf["gpu_venv_path"] = profile.venv_path
        
        # Trigger Airflow DAG
        dag_run_id = await airflow.trigger_dag(
            dag_id=DAG_ID,
            conf=dag_conf
        )
        if dag_run_id:
            run.airflow_dag_run_id = dag_run_id
            await db.flush()
            await db.refresh(run)
    else:
        # Scheduled: dynamic DAG generation
        import os
        run.airflow_dag_id = f"visionops_scheduled_{run.id}"
        run.status = "scheduled" # New status to indicate it's waiting for Airflow scheduler
        db.add(run)
        await db.flush()
        await db.refresh(run)
        
        if payload.schedule_type == "one_time_future":
            schedule_expr = "'@once'"
            start_date_expr = f"datetime.fromisoformat('{payload.scheduled_for.isoformat()}')"
        else:
            schedule_expr = f"'{payload.schedule_expression}'"
            start_date_expr = "datetime.utcnow()"
            
        # Build GPU profile details if remote
        gpu_vars = ""
        if run.run_mode == "remote" and run.remote_gpu_profile_id:
            from app.models.gpu_profile import RemoteGPUProfile
            profile = await db.get(RemoteGPUProfile, run.remote_gpu_profile_id)
            if profile:
                gpu_vars = f"""
GPU_HOST = '{profile.host}'
GPU_PORT = {profile.port}
GPU_USER = '{profile.username}'
GPU_SSH_KEY = '{profile.ssh_key_path}'
GPU_VENV = '{profile.venv_path or ""}'
                """
            
        dag_code = f"""
import os
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.empty import EmptyOperator
from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount

default_args = {{
    'owner': 'visionops',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 0,
}}

dag = DAG(
    'visionops_scheduled_{run.id}',
    default_args=default_args,
    description='Dynamically generated scheduled run',
    schedule_interval={schedule_expr},
    start_date={start_date_expr},
    catchup=False,
    tags=['visionops', 'scheduled'],
)

# Configuration
RUN_ID = '{run.id}'
MODEL_NAME = '{run.model_name}'
DATASET_PATH = '{_to_airflow_path(run.dataset_path)}'
EPOCHS = {run.epochs}
BATCH_SIZE = {run.batch_size}
LEARNING_RATE = {run.learning_rate}
IMAGE_SIZE = {run.image_size}
USE_BG = {run.use_bg_injection}
BG_PATH = '{_to_airflow_path(run.bg_images_path)}'
RUN_MODE = '{run.run_mode}'
{gpu_vars}

prev_task = None

if USE_BG and BG_PATH:
    inject_bg = BashOperator(
        task_id='inject_bg_images',
        bash_command=f"python /opt/airflow/ml/inject_background.py inject --source_dir '{{BG_PATH}}' --dataset_path '{{DATASET_PATH}}'",
        dag=dag,
    )
    prev_task = inject_bg

if RUN_MODE == 'remote':
    ssh_cmd = f"ssh -i {{GPU_SSH_KEY}} -o StrictHostKeyChecking=no -p {{GPU_PORT}} {{GPU_USER}}@{{GPU_HOST}}"
    scp_cmd = f"scp -i {{GPU_SSH_KEY}} -o StrictHostKeyChecking=no -P {{GPU_PORT}}"
    remote = f"{{GPU_USER}}@{{GPU_HOST}}"
    workspace = f"/tmp/visionops_run_{{RUN_ID}}"
    
    sync_to_gpu = BashOperator(
        task_id='sync_to_gpu',
        bash_command=f\"\"\"
        $ssh_cmd "mkdir -p {{workspace}}/datasets"
        $scp_cmd -r /opt/airflow/ml {{remote}}:{{workspace}}/
        $scp_cmd -r '{{DATASET_PATH}}' {{remote}}:{{workspace}}/datasets/
        $scp_cmd /opt/airflow/ml/inject_background.py {{remote}}:{{workspace}}/ || true
        if [ "{{USE_BG}}" = "True" ] && [ -n "{{BG_PATH}}" ]; then
            $scp_cmd -r '{{BG_PATH}}' {{remote}}:{{workspace}}/bg_images/
        fi
        \"\"\",
        dag=dag,
    )
    
    dataset_name = os.path.basename(DATASET_PATH.rstrip('/'))
        run_training = BashOperator(
        task_id='run_training_remote',
        bash_command=f\"\"\"
        ACTIVATE_CMD=""
        if [ -n "{{GPU_VENV}}" ]; then
            ACTIVATE_CMD="source {{GPU_VENV}}/bin/activate && "
        fi
        
        $ssh_cmd "cd {{workspace}} && $ACTIVATE_CMD python ml/train.py \\
          --model-name '{{MODEL_NAME}}' \\
          --dataset-path {{workspace}}/datasets/{{dataset_name}} \\
          --epochs {{EPOCHS}} \\
          --batch-size {{BATCH_SIZE}} \\
          --learning-rate {{LEARNING_RATE}} \\
          --image-size {{IMAGE_SIZE}} \\
          --run-id '{{RUN_ID}}'"
        \"\"\",
        execution_timeout=None,
        dag=dag,
    )
    
    sync_results = BashOperator(
        task_id='sync_results_back',
        bash_command=f\"\"\"
        mkdir -p /opt/airflow/trained_models
        for i in 1 2 3 4 5; do
            if $scp_cmd -r {{remote}}:{{workspace}}/runs/ /opt/airflow/trained_models/; then exit 0; fi
            sleep 15
        done
        exit 1
        \"\"\",
        dag=dag,
    )
    
    cleanup_remote = BashOperator(
        task_id='cleanup_remote',
        bash_command=f'$ssh_cmd "rm -rf {{workspace}}" || true',
        trigger_rule='all_done',
        dag=dag,
    )
    
    if prev_task:
        prev_task >> sync_to_gpu
    sync_to_gpu >> run_training >> sync_results >> cleanup_remote
    prev_task = cleanup_remote
else:
    # Determine host project root for DooD mounts
    import os
    HOST_PROJECT_ROOT = os.environ.get('HOST_PROJECT_ROOT', '/opt/airflow')

    run_training = DockerOperator(
        task_id='run_training_local',
        image='visionops-ml-worker:latest',
        api_version='auto',
        auto_remove='force',
        mount_tmp_dir=False,
        command=f\"\"\"
        python /app/ml/train.py \\
          --model-name '{{MODEL_NAME}}' \\
          --dataset-path '{{DATASET_PATH}}' \\
          --epochs {{EPOCHS}} \\
          --batch-size {{BATCH_SIZE}} \\
          --learning-rate {{LEARNING_RATE}} \\
          --image-size {{IMAGE_SIZE}} \\
          --run-id '{{RUN_ID}}'
        \"\"\",
        docker_url='unix://var/run/docker.sock',
        network_mode='visionops_visionops',
        mounts=[
            Mount(source=f'{{HOST_PROJECT_ROOT}}/ml', target='/app/ml', type='bind', read_only=True),
            Mount(source=f'{{HOST_PROJECT_ROOT}}/datasets', target='/opt/airflow/datasets', type='bind')
        ],
        environment={{'MLFLOW_TRACKING_URI': 'http://mlflow:5000'}},
        dag=dag,
    )
    if prev_task:
        prev_task >> run_training
    prev_task = run_training

# Cleanup local injected images
cleanup_bg = BashOperator(
    task_id='cleanup_bg_images',
    bash_command=f"python /opt/airflow/ml/inject_background.py cleanup --dataset_path '{{DATASET_PATH}}'",
    trigger_rule='all_done',
    dag=dag,
)

if prev_task:
    prev_task >> cleanup_bg
"""
        dags_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../airflow/dags"))
        file_path = os.path.join(dags_dir, f"visionops_scheduled_{run.id}.py")
        with open(file_path, "w") as f:
            f.write(dag_code.strip())
            
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
