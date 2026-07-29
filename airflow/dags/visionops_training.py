import json
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

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
    
    # In Airflow 2.0+, dag_run.conf is accessed via Jinja templates
    # We pass the conf as a JSON string to the python script
    
    train_command = """
    # In a real environment, this might SSH into a GPU box or run inside a specific container
    # For local scaffold, we run it directly in the Airflow worker container or host
    python /opt/visionops/train.py \
      --model-name '{{ dag_run.conf.get("model_name", "yolov8n") }}' \
      --dataset-path '{{ dag_run.conf.get("dataset_path", "") }}' \
      --epochs {{ dag_run.conf.get("epochs", 50) }} \
      --batch-size {{ dag_run.conf.get("batch_size", 16) }} \
      --learning-rate {{ dag_run.conf.get("learning_rate", 0.01) }} \
      --image-size {{ dag_run.conf.get("image_size", 640) }} \
      --run-id '{{ dag_run.conf.get("run_id", "") }}'
    """
    
    run_training = BashOperator(
        task_id='run_training_script',
        bash_command=train_command,
    )
    
    run_training
