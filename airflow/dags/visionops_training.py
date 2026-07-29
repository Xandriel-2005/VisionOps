import json
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.providers.docker.operators.docker import DockerOperator
from docker.types import Mount

# Default arguments for the DAG
default_args = {
    'owner': 'visionops',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 0,
    'retry_delay': timedelta(minutes=1),
}

# Define the DAG
with DAG(
    'visionops_training',
    default_args=default_args,
    description='Triggers the VisionOps training script',
    schedule_interval=None,
    start_date=datetime(2023, 1, 1),
    catchup=False,
    tags=['visionops', 'training'],
) as dag:
    

    
    # Use DockerOperator to spin up the ML Worker container
    run_training = DockerOperator(
        task_id='run_training_script',
        image='visionops-ml-worker:latest',
        api_version='auto',
        auto_remove='force',
        command="""
        python /app/train.py \
          --model-name '{{ dag_run.conf.get("model_name", "yolov8n") }}' \
          --dataset-path '{{ dag_run.conf.get("dataset_path", "") }}' \
          --epochs {{ dag_run.conf.get("epochs", 50) }} \
          --batch-size {{ dag_run.conf.get("batch_size", 16) }} \
          --learning-rate {{ dag_run.conf.get("learning_rate", 0.01) }} \
          --image-size {{ dag_run.conf.get("image_size", 640) }} \
          --run-id '{{ dag_run.conf.get("run_id", "") }}'
        """,
        docker_url='unix://var/run/docker.sock',
        network_mode='bridge',
        mounts=[
            # Mount the scripts and datasets into the ML container
            Mount(source='/opt/airflow/train.py', target='/app/train.py', type='bind', read_only=True),
            Mount(source='/opt/airflow/detectors', target='/app/detectors', type='bind', read_only=True),
            Mount(source='/opt/airflow/datasets', target='/opt/airflow/datasets', type='bind')
        ],
        environment={
            'MLFLOW_TRACKING_URI': 'http://host.docker.internal:5000'
        }
    )
    
    run_training
