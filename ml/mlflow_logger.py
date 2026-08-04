import os
import time
import socket
import mlflow
import mlflow.pyfunc
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

def setup_experiment(tracking_uri: str, experiment_name: str):
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment(experiment_name)
    try:
        # Enables logging of CPU, RAM, Network, Disk, and GPU (if pynvml is installed)
        mlflow.enable_system_metrics_logging()
    except Exception as e:
        print(f"[mlflow_logger] WARNING: Could not enable system metrics: {e}")

class EpochCallback:
    
    def __init__(self):
        self.history: dict[str, list[float]] = {}
        self.best_map: float = 0.0
        self.best_epoch: int = 0

    def on_epoch_end(self, epoch: int, metrics: dict):
        for k, v in metrics.items():
            clean_k = k.replace("(", "_").replace(")", "")
            self.history.setdefault(clean_k, []).append(float(v))
            try:
                mlflow.log_metric(clean_k, float(v), step=epoch)
            except Exception as e:
                print(f"[mlflow_logger] WARNING: Could not log metric {clean_k}: {e}")
            
        map50 = metrics.get("metrics/mAP50(B)", metrics.get("val/mAP50", 0))
        if map50 > self.best_map:
            self.best_map = map50
            self.best_epoch = epoch

def _plot_metric_curves(history: dict, out_dir: str) -> list[str]:
    os.makedirs(out_dir, exist_ok=True)
    saved = []

    groups = {}
    for k, v in history.items():
        if not v: continue
        base = k.replace("train/", "").replace("val/", "")
        groups.setdefault(base, {})[k] = v

    for base, curves in groups.items():
        fig, ax = plt.subplots(figsize=(8, 4))
        for name, vals in curves.items():
            ax.plot(range(1, len(vals) + 1), vals, label=name, marker="o", markersize=3)
        ax.set_xlabel("Epoch")
        ax.set_ylabel(base)
        ax.set_title(base)
        if len(curves) > 1:
            ax.legend()
        ax.grid(True, alpha=0.3)
        fig.tight_layout()
        path = os.path.join(out_dir, f"{base.replace('/', '_')}.png")
        fig.savefig(path, dpi=120)
        plt.close(fig)
        saved.append(path)

    return saved

def log_run_params(args, config: dict, model_stem: str, dataset_yaml: str, effective_weights: str, detector):
    epochs = args.epochs or config["training"]["epochs"]
    model_arch = config["training"].get("model_arch", "unknown")
    mlflow.log_params({
        "model_arch":   model_arch,
        "model_stem":   model_stem,
        "dataset_yaml": dataset_yaml,
        "epochs":       epochs,
        "imgsz":        config["training"]["imgsz"],
        "batch":        config["training"]["batch"],
        "device":       args.device,
        "weights":      effective_weights,
        "optimizer":    config["training"].get("optimizer", "auto"),
        "lr0":          config["training"].get("lr0", "auto"),
        "lrf":          config["training"].get("lrf", "auto"),
        "momentum":     config["training"].get("momentum", "auto"),
        "weight_decay": config["training"].get("weight_decay", "auto"),
        "warmup_epochs":config["training"].get("warmup_epochs", "auto"),
        "augment":      config["training"].get("augment", True),
        "conf":         config["training"].get("conf", "auto"),
    })

    mlflow.set_tags({
        **detector.get_metadata(),
        "hostname":     socket.gethostname(),
        "config_file":  os.path.abspath(args.config) if getattr(args, 'config', None) else "None",
        "run_start_ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "visionops_run_id": str(getattr(args, 'run_id', "unknown")),
    })

    try:
        mlflow.log_artifact(args.config, artifact_path="config")
    except Exception as e:
        print(f"[mlflow_logger] WARNING: Could not log config artifact: {e}")

class UltralyticsWrapper(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
        from ultralytics import YOLO, RTDETR
        weights_path = context.artifacts["weights"]
        if "rtdetr" in os.path.basename(weights_path).lower():
            self.model = RTDETR(weights_path)
        else:
            self.model = YOLO(weights_path)

    def predict(self, context, model_input):
        return self.model(model_input)

def log_run_results(config: dict, final_metrics: dict, train_time: float, cb: EpochCallback, best_pt: str, run_name: str):
    try:
        mlflow.log_metrics({
            **{f"final/{k}": float(v) for k, v in final_metrics.items()},
            "train_time_sec": train_time,
            "best_map50_epoch": cb.best_epoch,
            "best_map50": cb.best_map,
        })
    except Exception as e:
        print(f"[mlflow_logger] WARNING: Could not log final metrics: {e}")

    plots_dir = os.path.join(
        config["training"]["project"], run_name, "mlflow_plots"
    )
    if cb.history:
        saved_plots = _plot_metric_curves(cb.history, plots_dir)
        for p in saved_plots:
            mlflow.log_artifact(p, artifact_path="metric_curves")

    yolo_out_dir = os.path.dirname(os.path.dirname(best_pt))

    # Upload full training output (plots, confusion matrix, etc.)
    try:
        if os.path.exists(yolo_out_dir):
            mlflow.log_artifacts(yolo_out_dir, artifact_path="yolo_full_output")
    except Exception as e:
        print(f"[mlflow_logger] WARNING: Could not log yolo output dir: {e}")

    # Upload best.pt weights
    try:
        if os.path.exists(best_pt):
            mlflow.log_artifact(best_pt, artifact_path="weights")
    except Exception as e:
        print(f"[mlflow_logger] WARNING: Could not log best.pt artifact: {e}")

    # Upload last.pt weights
    try:
        last_pt = best_pt.replace("best.pt", "last.pt")
        if os.path.exists(last_pt):
            mlflow.log_artifact(last_pt, artifact_path="weights")
    except Exception as e:
        print(f"[mlflow_logger] WARNING: Could not log last.pt artifact: {e}")

    # Register as pyfunc model (may fail on older MLflow servers — not critical)
    try:
        if os.path.exists(best_pt):
            mlflow.pyfunc.log_model(
                artifact_path="model",
                python_model=UltralyticsWrapper(),
                artifacts={"weights": best_pt},
            )
    except Exception as e:
        print(f"[mlflow_logger] WARNING: Could not log pyfunc model (non-critical): {e}")

