import os
from typing import Dict, Any, List
from mlflow.tracking import MlflowClient as OriginalMlflowClient

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

# Singleton instance
mlflow_client = TrackingClient(
    tracking_uri=os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
)
