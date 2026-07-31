import os
import sys
import csv
import argparse
import yaml
import mlflow

def load_config(config_path="config/pipeline_config.yaml"):
    if os.path.exists(config_path):
        try:
            with open(config_path, "r") as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"[import_offline] WARNING: Could not load {config_path}: {e}")
    return {}

def import_run_directory(run_dir: str, tracking_uri: str, experiment_name: str):
    subfolder_name = os.path.basename(os.path.normpath(run_dir))
    csv_path = os.path.join(run_dir, "results.csv")
    if not os.path.exists(csv_path):
        print(f"[import_offline] Skipping {subfolder_name}: No results.csv found at {csv_path}")
        return

    print(f"\n[import_offline] --------------------------------------------")
    print(f"[import_offline] Processing run directory: {run_dir}")
    print(f"[import_offline] Experiment: {experiment_name} | URI: {tracking_uri}")

    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment_name)

    run_id_file = os.path.join(run_dir, ".mlflow_run_id")
    run = None
    if os.path.exists(run_id_file):
        with open(run_id_file, "r") as f:
            saved_id = f.read().strip()
        if saved_id:
            try:
                run = mlflow.start_run(run_id=saved_id)
                print(f"[import_offline] Reopened existing MLflow run {saved_id} for {subfolder_name}")
            except Exception as e:
                print(f"[import_offline] Could not reopen run {saved_id} ({e}). Creating new run...")

    if run is None:
        run = mlflow.start_run(run_name=subfolder_name)
        print(f"[import_offline] Started new MLflow run {run.info.run_id} for {subfolder_name}")

    try:
        # Save run id back to disk
        os.makedirs(run_dir, exist_ok=True)
        with open(run_id_file, "w") as f:
            f.write(run.info.run_id)

        legacy_id_file = os.path.join(os.path.dirname(run_dir), "mlflow_run_id.txt")
        try:
            with open(legacy_id_file, "w") as f:
                f.write(run.info.run_id)
        except Exception:
            pass

        # Parse results.csv and log epoch metrics
        best_map50 = 0.0
        best_epoch = 0
        final_metrics = {}
        epochs_logged = 0

        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                epoch_str = None
                for k in row.keys():
                    if k and k.strip().lower() == "epoch":
                        epoch_str = row[k]
                        break
                if not epoch_str:
                    continue
                try:
                    epoch = int(float(epoch_str.strip()))
                except ValueError:
                    continue

                epochs_logged += 1
                for k, v_str in row.items():
                    if not k or k.strip().lower() == "epoch" or v_str is None:
                        continue
                    clean_k = k.strip().replace("(", "_").replace(")", "")
                    try:
                        val = float(v_str.strip())
                        mlflow.log_metric(clean_k, val, step=epoch)
                        final_metrics[clean_k] = val
                        if "map50" in clean_k.lower() and not "95" in clean_k:
                            if val > best_map50:
                                best_map50 = val
                                best_epoch = epoch
                    except ValueError:
                        pass

        print(f"[import_offline] ✓ Logged metrics for {epochs_logged} epochs.")
        if final_metrics:
            mlflow.log_metric("best_map50", best_map50)
            mlflow.log_metric("best_map50_epoch", best_epoch)
            for k, val in final_metrics.items():
                try:
                    mlflow.log_metric(f"final/{k}", val)
                except Exception:
                    pass

        # Log visual artifacts and plots
        plots_dir = os.path.join(run_dir, "mlflow_plots")
        if os.path.exists(plots_dir) and os.path.isdir(plots_dir):
            try:
                mlflow.log_artifacts(plots_dir, artifact_path="metric_curves")
                print(f"[import_offline] ✓ Logged metric curves from {plots_dir}")
            except Exception as e:
                print(f"[import_offline] WARNING: Could not log metric_curves: {e}")

        # Log YOLO root output files (png, jpg, csv)
        for fname in os.listdir(run_dir):
            if fname.lower().endswith((".png", ".jpg", ".jpeg", ".csv")) and os.path.isfile(os.path.join(run_dir, fname)):
                try:
                    mlflow.log_artifact(os.path.join(run_dir, fname), artifact_path="yolo_full_output")
                except Exception as e:
                    print(f"[import_offline] WARNING: Could not log artifact {fname}: {e}")

        # Log model weights
        weights_dir = os.path.join(run_dir, "weights")
        if os.path.exists(weights_dir):
            for wname in ("best.pt", "last.pt"):
                wpath = os.path.join(weights_dir, wname)
                if os.path.exists(wpath):
                    try:
                        mlflow.log_artifact(wpath, artifact_path="weights")
                        print(f"[import_offline] ✓ Logged weight artifact: {wname}")
                    except Exception as e:
                        print(f"[import_offline] WARNING: Could not log weight {wname}: {e}")

        print(f"[import_offline] Successfully synchronized {subfolder_name} to MLflow.")

    finally:
        mlflow.end_run()

def main():
    parser = argparse.ArgumentParser(description="Import offline training runs from results.csv into MLflow.")
    parser.add_argument("--dir", type=str, default=None, help="Root runs directory containing subfolders (default: from config or 'data/runs')")
    parser.add_argument("--tracking_uri", type=str, default=None, help="MLflow tracking URI (default: from env or 'http://localhost:5000')")
    parser.add_argument("--experiment", type=str, default=None, help="MLflow experiment name (default: 'object-detection-gpu')")
    args = parser.parse_args()

    config = load_config()
    runs_dir = args.dir or config.get("training", {}).get("project", "data/runs")
    tracking_uri = args.tracking_uri or os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    experiment_name = args.experiment or "object-detection-gpu"

    if not os.path.exists(runs_dir):
        print(f"[import_offline] ERROR: Runs directory '{runs_dir}' does not exist.")
        sys.exit(1)

    print(f"[import_offline] Scanning '{runs_dir}' for training runs...")
    found_any = False
    for item in sorted(os.listdir(runs_dir)):
        sub_dir = os.path.join(runs_dir, item)
        if os.path.isdir(sub_dir) and os.path.exists(os.path.join(sub_dir, "results.csv")):
            found_any = True
            import_run_directory(sub_dir, tracking_uri, experiment_name)

    if not found_any:
        print(f"[import_offline] No training runs with results.csv found in '{runs_dir}'.")

if __name__ == "__main__":
    main()
