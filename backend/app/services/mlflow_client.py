import os
from typing import Dict, Any, List
from mlflow.tracking import MlflowClient as OriginalMlflowClient

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))

class TrackingClient:
    """Client to interact with MLflow Tracking Server."""
    
    def __init__(self, tracking_uri: str = "http://localhost:5000"):
        self.tracking_uri = tracking_uri
        self.client = OriginalMlflowClient(tracking_uri=tracking_uri)
        
    def get_run_metrics(self, run_id: str) -> Dict[str, float]:
        """Fetches all metrics logged for a specific run."""
        try:
            run = self.client.get_run(run_id)
            return run.data.metrics
        except Exception as e:
            print(f"Error fetching MLflow metrics for {run_id}: {e}")
            return {}
            
    def get_run_params(self, run_id: str) -> Dict[str, str]:
        """Fetches all parameters logged for a specific run."""
        try:
            run = self.client.get_run(run_id)
            return run.data.params
        except Exception as e:
            print(f"Error fetching MLflow params for {run_id}: {e}")
            return {}
            
    def get_metric_history(self, run_id: str, metric_key: str) -> List[Dict[str, Any]]:
        """Fetches the history of a specific metric for a run."""
        try:
            history = self.client.get_metric_history(run_id, metric_key)
            return [{"step": m.step, "value": m.value, "timestamp": m.timestamp} for m in history]
        except Exception as e:
            print(f"Error fetching metric history {metric_key} for {run_id}: {e}")
            return []
            
    def get_experiment_runs(self, experiment_name: str = "visionops_training") -> List[Dict[str, Any]]:
        """Gets recent runs for an experiment."""
        try:
            experiment = self.client.get_experiment_by_name(experiment_name)
            if not experiment:
                return []
                
            runs = self.client.search_runs(experiment_ids=[experiment.experiment_id], max_results=20)
            
            result = []
            for run in runs:
                result.append({
                    "run_id": run.info.run_id,
                    "status": run.info.status,
                    "metrics": run.data.metrics,
                    "params": run.data.params,
                    "tags": run.data.tags,
                    "start_time": run.info.start_time,
                    "end_time": run.info.end_time
                })
            return result
        except Exception as e:
            print(f"Error fetching runs for experiment {experiment_name}: {e}")
            return []

    def get_run_artifacts(self, run_id: str) -> List[str]:
        """Gets a list of artifact paths for a run."""
        try:
            artifacts = self.client.list_artifacts(run_id)
            return [a.path for a in artifacts]
        except Exception as e:
            print(f"Error fetching artifacts for run {run_id}: {e}")
            return []

    def register_model(self, run_id: str, registry_name: str, description: str = "") -> Dict[str, Any]:
        """Registers a model from a specific run to the MLflow Model Registry."""
        try:
            # 1. Ensure registered model exists
            try:
                self.client.create_registered_model(registry_name)
            except Exception:
                pass  # Already exists

            # 2. Resolve source URI
            run = self.client.get_run(run_id)
            source_uri = f"{run.info.artifact_uri}/model"
            
            # 3. Create version
            mv = self.client.create_model_version(
                name=registry_name,
                source=source_uri,
                run_id=run_id,
                description=description
            )
            
            # 4. Copy + rename the trained weights locally
            import shutil, glob
            
            target_dir = os.path.join(REPO_ROOT, "models", "trained_weights")
            os.makedirs(target_dir, exist_ok=True)
            target_file = os.path.join(target_dir, f"{registry_name}_v{mv.version}.pt")
            
            # Find the best.pt from local disk — the run name is in the MLflow tags
            run_name = run.data.tags.get("mlflow.runName", "")
            # Extract the numeric/string prefix before the timestamp (e.g. "33" from "33_20260802_215327")
            run_label = run_name.split("_")[0] if run_name else ""
            
            best_pt = None
            
            # Strategy A: Check if save_model() already placed it in trained_weights/{run_label}.pt
            candidate_a = os.path.join(target_dir, f"{run_label}.pt")
            if run_label and os.path.isfile(candidate_a):
                best_pt = candidate_a
            
            # Strategy B: Look in runs/detect/runs/train/{run_label}/weights/best.pt
            if not best_pt:
                runs_dir = os.path.join(REPO_ROOT, "runs")
                pattern = os.path.join(runs_dir, "**", run_label, "weights", "best.pt")
                matches = glob.glob(pattern, recursive=True)
                if matches:
                    best_pt = matches[0]
            
            # Strategy C: Try MLflow artifact download as last resort
            if not best_pt:
                try:
                    from mlflow.artifacts import download_artifacts
                    weights_uri = f"{run.info.artifact_uri}/weights/best.pt"
                    best_pt = download_artifacts(artifact_uri=weights_uri, dst_path=target_dir)
                except Exception as dl_err:
                    print(f"MLflow artifact download also failed: {dl_err}")
            
            if best_pt and os.path.isfile(best_pt):
                shutil.copy2(best_pt, target_file)
                print(f"Successfully copied weights to {target_file}")
                
                # Clean up the intermediary file if it was from Strategy A
                if best_pt == candidate_a and best_pt != target_file:
                    try:
                        os.remove(candidate_a)
                    except Exception:
                        pass
            else:
                print(f"WARNING: Could not locate best.pt for run {run_id} (run_label={run_label})")
            
            return {"name": mv.name, "version": mv.version}
        except Exception as e:
            print(f"Error registering model for run {run_id}: {e}")
            raise e

# Singleton instance
mlflow_client = TrackingClient(
    tracking_uri=os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
)
