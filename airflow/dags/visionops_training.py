import json
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.operators.python import BranchPythonOperator
from airflow.operators.empty import EmptyOperator
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


# ── Helper: build SSH command prefix from dag_run.conf ──
def _ssh_prefix():
    """Jinja template for SSH command prefix using GPU profile details from conf."""
    return (
        'ssh -i {{ dag_run.conf.get("gpu_ssh_key_path", "") }} '
        '-o StrictHostKeyChecking=no '
        '-p {{ dag_run.conf.get("gpu_port", 22) }} '
        '{{ dag_run.conf.get("gpu_user", "") }}@{{ dag_run.conf.get("gpu_host", "") }}'
    )


def _scp_prefix():
    """Jinja template for SCP command prefix."""
    return (
        'scp -i {{ dag_run.conf.get("gpu_ssh_key_path", "") }} '
        '-o StrictHostKeyChecking=no '
        '-P {{ dag_run.conf.get("gpu_port", 22) }}'
    )


# Define the DAG
with DAG(
    'visionops_training',
    default_args=default_args,
    description='VisionOps training pipeline: inject BG images → train (local/remote) → cleanup',
    schedule_interval=None,
    start_date=datetime(2023, 1, 1),
    catchup=False,
    tags=['visionops', 'training'],
) as dag:

    # Step 0: Decide whether BG injection is needed

    def _check_bg_injection(**context):
        conf = context['dag_run'].conf or {}
        if conf.get('use_bg_injection') and conf.get('bg_images_path'):
            return 'inject_bg_images'
        return 'skip_injection'

    branch_bg = BranchPythonOperator(
        task_id='check_bg_injection',
        python_callable=_check_bg_injection,
    )

    skip_injection = EmptyOperator(task_id='skip_injection')

    inject_bg = BashOperator(
        task_id='inject_bg_images',
        bash_command="""
        python /opt/airflow/ml/inject_background.py inject \
          --source_dir '{{ dag_run.conf.get("bg_images_path", "") }}' \
          --dataset_path '{{ dag_run.conf.get("dataset_path", "") }}'
        """,
    )

    # ── Join point before branching to local/remote ──
    start_training_branch = EmptyOperator(
        task_id='start_training_branch',
        trigger_rule='none_failed_min_one_success',
    )

    # ══════════════════════════════════════════════════════
    # Step 1: Decide local vs. remote training
    # ══════════════════════════════════════════════════════
    def _check_run_mode(**context):
        conf = context['dag_run'].conf or {}
        if conf.get('run_mode') == 'remote':
            return 'sync_to_gpu'
        return 'run_training_local'

    branch_mode = BranchPythonOperator(
        task_id='check_run_mode',
        python_callable=_check_run_mode,
    )

    # ── LOCAL training path ──
    # Determine host project root for DooD mounts
    import os
    HOST_PROJECT_ROOT = os.environ.get('HOST_PROJECT_ROOT', '/opt/airflow')

    run_training_local = DockerOperator(
        task_id='run_training_local',
        image='visionops-ml-worker:latest',
        api_version='auto',
        auto_remove='force',
        mount_tmp_dir=False,
        command=f"""
        python -m ml.train \
          --model-name '{{{{ dag_run.conf.get("model_name") }}}}' \
          --dataset-path '{{{{ dag_run.conf.get("dataset_path") }}}}' \
          --epochs {{{{ dag_run.conf.get("epochs", 1) }}}} \
          --batch-size {{{{ dag_run.conf.get("batch_size", 16) }}}} \
          --learning-rate {{{{ dag_run.conf.get("learning_rate", 0.001) }}}} \
          --image-size {{{{ dag_run.conf.get("image_size", 640) }}}} \
          --run-id '{{{{ dag_run.conf.get("run_id", "local_run") }}}}'
        """,
        docker_url='unix://var/run/docker.sock',
        network_mode='visionops_visionops',
        mounts=[
            Mount(source=f'{HOST_PROJECT_ROOT}/ml', target='/app/ml', type='bind', read_only=True),
            Mount(source=f'{HOST_PROJECT_ROOT}/datasets', target='/opt/airflow/datasets', type='bind'),
            Mount(source=f'{HOST_PROJECT_ROOT}/models', target='/opt/airflow/models', type='bind'),
            Mount(source=f'{HOST_PROJECT_ROOT}/runs', target='/app/runs', type='bind')
        ],
        environment={
            'MLFLOW_TRACKING_URI': 'http://mlflow:5000',
            'GIT_PYTHON_REFRESH': 'quiet'
        }
    )

    # ── REMOTE training path (adapted from ml-pipeline gpu_ssh_helpers) ──

    # 1. Sync code, weights, dataset, and scripts to the remote GPU server
    sync_to_gpu = BashOperator(
        task_id='sync_to_gpu',
        bash_command=f"""
        SSH_CMD='{_ssh_prefix()}'
        SCP_CMD='{_scp_prefix()}'
        REMOTE='{{{{ dag_run.conf.get("gpu_user", "") }}}}@{{{{ dag_run.conf.get("gpu_host", "") }}}}'
        WORKSPACE='/tmp/visionops_run_{{{{ dag_run.conf.get("run_id", "") }}}}'

        # Create workspace on remote
        $SSH_CMD "mkdir -p $WORKSPACE/detectors $WORKSPACE/datasets"

        # Sync training script, detectors, and dataset
        $SCP_CMD /opt/airflow/train.py $REMOTE:$WORKSPACE/
        $SCP_CMD -r /opt/airflow/detectors/* $REMOTE:$WORKSPACE/detectors/
        $SCP_CMD -r '{{{{ dag_run.conf.get("dataset_path", "") }}}}' $REMOTE:$WORKSPACE/datasets/

        # Sync inject script and BG images if needed
        $SCP_CMD /opt/airflow/ml/inject_background.py $REMOTE:$WORKSPACE/ || true
        if [ "{{{{ dag_run.conf.get("use_bg_injection", false) }}}}" = "True" ] && [ -n "{{{{ dag_run.conf.get("bg_images_path", "") }}}}" ]; then
            $SCP_CMD -r '{{{{ dag_run.conf.get("bg_images_path", "") }}}}' $REMOTE:$WORKSPACE/bg_images/
        fi
        """,
    )

    # 2. Run training on the remote GPU server via SSH
    run_training_remote = BashOperator(
        task_id='run_training_remote',
        bash_command=f"""
        SSH_CMD='{_ssh_prefix()}'
        WORKSPACE='/tmp/visionops_run_{{{{ dag_run.conf.get("run_id", "") }}}}'
        DATASET_NAME=$(basename '{{{{ dag_run.conf.get("dataset_path", "") }}}}')
        VENV_PATH='{{{{ dag_run.conf.get("gpu_venv_path", "") }}}}'

        ACTIVATE_CMD=""
        if [ -n "$VENV_PATH" ]; then
            ACTIVATE_CMD="source $VENV_PATH/bin/activate && "
        fi

        $SSH_CMD "cd $WORKSPACE && $ACTIVATE_CMD python train.py \\
          --model-name '{{{{ dag_run.conf.get("model_name", "yolov8n") }}}}' \\
          --dataset-path $WORKSPACE/datasets/$DATASET_NAME \\
          --epochs {{{{ dag_run.conf.get("epochs", 50) }}}} \\
          --batch-size {{{{ dag_run.conf.get("batch_size", 16) }}}} \\
          --learning-rate {{{{ dag_run.conf.get("learning_rate", 0.01) }}}} \\
          --image-size {{{{ dag_run.conf.get("image_size", 640) }}}} \\
          --run-id '{{{{ dag_run.conf.get("run_id", "") }}}}'"
        """,
        execution_timeout=None,  # Training can take hours
    )

    # 3. Sync trained weights back from the remote GPU server
    sync_results_back = BashOperator(
        task_id='sync_results_back',
        bash_command=f"""
        SCP_CMD='{_scp_prefix()}'
        REMOTE='{{{{ dag_run.conf.get("gpu_user", "") }}}}@{{{{ dag_run.conf.get("gpu_host", "") }}}}'
        WORKSPACE='/tmp/visionops_run_{{{{ dag_run.conf.get("run_id", "") }}}}'

        mkdir -p /opt/airflow/trained_models

        for i in 1 2 3 4 5; do
            if $SCP_CMD -r $REMOTE:$WORKSPACE/runs/ /opt/airflow/trained_models/; then
                echo "[sync] Trained weights synced successfully."
                exit 0
            fi
            echo "[sync] Attempt $i failed. Retrying in 15s..."
            sleep 15
        done
        echo "[sync] WARNING: Could not sync after 5 attempts."
        exit 1
        """,
    )

    # 4. Cleanup remote workspace
    cleanup_remote = BashOperator(
        task_id='cleanup_remote',
        bash_command=f"""
        if [ "{{{{ dag_run.conf.get("run_mode", "local") }}}}" != "remote" ]; then
            echo "Local mode: Skipping remote cleanup."
            exit 0
        fi
        
        SSH_CMD='{_ssh_prefix()}'
        WORKSPACE='/tmp/visionops_run_{{{{ dag_run.conf.get("run_id", "") }}}}'
        $SSH_CMD "rm -rf $WORKSPACE" || true
        """,
        trigger_rule='all_done',
    )

    # ── Merge point after local OR remote training ──
    merge_training_branch = EmptyOperator(
        task_id='merge_training_branch',
        trigger_rule='none_failed_min_one_success',
    )

    # Step 2: Cleanup injected BG images (restore dataset)

    cleanup_bg = BashOperator(
        task_id='cleanup_bg_images',
        bash_command="""
        python /opt/airflow/ml/inject_background.py cleanup \
          --dataset_path '{{ dag_run.conf.get("dataset_path", "") }}'
        """,
        trigger_rule='all_done',
    )


    branch_bg >> [inject_bg, skip_injection] >> start_training_branch >> branch_mode

    # Local path
    branch_mode >> run_training_local >> merge_training_branch

    # Remote path
    branch_mode >> sync_to_gpu >> run_training_remote >> sync_results_back >> cleanup_remote >> merge_training_branch

    merge_training_branch >> cleanup_bg
