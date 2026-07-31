
import argparse, os, yaml, mlflow

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config",     required=True)
    args = parser.parse_args()

    with open(args.config) as f:
        config = yaml.safe_load(f)

    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])

    # Fetch run ID from train step
    run_id_file = os.path.join(config["training"]["project"], "mlflow_run_id.txt")
    with open(run_id_file) as f:
        run_id = f.read().strip()

    model_arch = config.get("training", {}).get("model_arch", "unknown")
    model_name = f"{model_arch}_detector"
    try:
        mv = mlflow.register_model(
            model_uri=f"runs:/{run_id}/model",
            name=model_name,
        )
        client = mlflow.tracking.MlflowClient()
        client.set_registered_model_alias(
            name=model_name,
            alias="staging",
            version=mv.version,
        )
        print(f"[register] {model_name} v{mv.version} → staging alias")
    except mlflow.exceptions.MlflowException as e:
        print(f"[register] Could not register to MLflow Models UI (requires MLmodel format): {e}")
        print(f"[register] Weights are saved as artifacts in run {run_id}.")
        
        # Tag run as Staging
        client = mlflow.tracking.MlflowClient()
        client.set_tag(run_id, "stage", "Staging")

if __name__ == "__main__":
    main()