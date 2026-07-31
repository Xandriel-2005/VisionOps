import argparse, os, time, yaml, mlflow
from ml.model_registry import get_detector
from ml.mlflow_logger import setup_experiment, EpochCallback, log_run_params, log_run_results
from ml.path_utils import (
    resolve_path, auto_resolve_dataset_yaml,
    resolve_weights, save_model,
)

def parse_args():
    parser = argparse.ArgumentParser(description="VisionOps ML Training Wrapper")
    parser.add_argument("--config",       default=None, help="Optional YAML config path")
    parser.add_argument("--dataset-path", default=None, help="Path to dataset YAML or folder")
    parser.add_argument("--dataset_yaml", default=None, help="Alias for dataset-path")
    parser.add_argument("--epochs",       type=int, default=50)
    parser.add_argument("--batch-size",   type=int, default=16)
    parser.add_argument("--learning-rate",type=float, default=0.01)
    parser.add_argument("--image-size",   type=int, default=640)
    parser.add_argument("--device",       default="")
    parser.add_argument("--model-name",   default="yolov8n", help="Model architecture")
    parser.add_argument("--run-id",       default="local_run", help="Unique run ID or name")
    parser.add_argument("--output_model_name", default=None, help="Custom output name")
    return parser.parse_args()

def load_config(args):
    # Default VisionOps config structure
    config = {
        "experiment_name": "visionops_training",
        "training": {
            "project": "runs/train",
            "epochs": args.epochs,
            "batch": args.batch_size,
            "learning_rate": args.learning_rate,
            "imgsz": args.image_size,
            "model_arch": args.model_name,
            "base_weights": args.model_name
        }
    }
    
    if args.config and os.path.exists(args.config):
        with open(args.config) as f:
            yaml_config = yaml.safe_load(f)
            # Merge yaml into defaults
            config["experiment_name"] = yaml_config.get("experiment_name", config["experiment_name"])
            if "training" in yaml_config:
                config["training"].update(yaml_config["training"])
                
    # Override with explicit CLI args if they were passed
    if args.epochs is not None: config["training"]["epochs"] = args.epochs
    if args.batch_size is not None: config["training"]["batch"] = args.batch_size
    if args.learning_rate is not None: config["training"]["learning_rate"] = args.learning_rate
    if args.image_size is not None: config["training"]["imgsz"] = args.image_size
    
    if args.model_name is not None: 
        config["training"]["base_weights"] = args.model_name
        if args.model_name.startswith("yolo") or args.model_name.endswith(".pt") or args.model_name.endswith(".onnx") or args.model_name.endswith(".tflite"):
            config["training"]["model_arch"] = "ultralytics_detector"
        else:
            config["training"]["model_arch"] = args.model_name
    
    return config

def main():
    args = parse_args()
    config = load_config(args)

    epochs = config["training"]["epochs"]
    dataset_yaml = args.dataset_path or args.dataset_yaml or auto_resolve_dataset_yaml(config)
    output_model_name = args.output_model_name or args.run_id

    try:
        effective_weights, model_stem = resolve_weights(config)
    except Exception:
        # Fallback if path_utils fails without a strict config
        effective_weights = config["training"].get("base_weights", args.model_name)
        model_stem = args.model_name

    # Auto-Resume Logic
    project_dir = resolve_path(config["training"]["project"])
    isolated_run_name = output_model_name
    last_pt = os.path.join(project_dir, isolated_run_name, "weights", "last.pt")
    
    resume_training = False
    if os.path.isfile(last_pt):
        print(f"[train] Found existing checkpoint at {last_pt}. Auto-resuming...")
        effective_weights = last_pt
        resume_training = True

    # Disable to stop duplicate runs logging inside ultralytics
    try:
        from ultralytics import settings
        settings.update({"mlflow": False})
    except Exception:
        pass

    tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")
    setup_experiment(tracking_uri, config["experiment_name"])

    model_arch = config["training"]["model_arch"]
    detector = get_detector(model_arch)
    
    try:
        detector.load(effective_weights)
    except Exception:
        # Fallback if registry signature differs slightly
        if hasattr(detector, "load"):
            detector.load()

    cb = EpochCallback()

    # MLflow run persistence across restarts
    run_id_file = os.path.join(project_dir, isolated_run_name, ".mlflow_run_id")
    saved_run_id = None
    if os.path.isfile(run_id_file):
        with open(run_id_file, "r") as f:
            saved_run_id = f.read().strip()

    if saved_run_id:
        print(f"[train] Found existing MLflow run ID {saved_run_id}. Reopening run...")
        run_context = mlflow.start_run(run_id=saved_run_id)
    else:
        run_name = f"{output_model_name}_{time.strftime('%Y%m%d_%H%M%S')}"
        run_context = mlflow.start_run(run_name=run_name)

    with run_context as run:
        if not saved_run_id:
            os.makedirs(os.path.dirname(run_id_file), exist_ok=True)
            with open(run_id_file, "w") as f:
                f.write(run.info.run_id)

        try:
            log_run_params(args, config, model_stem, dataset_yaml, effective_weights, detector)
        except Exception as e:
            print(f"[train] WARNING: Could not log all params: {e}")
            mlflow.log_params({"model_arch": model_arch, "dataset_yaml": dataset_yaml, "epochs": epochs})

        # Training
        t0 = time.time()
        
        # Support both new ml-pipeline kwargs and old VisionOps kwargs dynamically
        train_kwargs = {
            "epochs": epochs,
            "batch": config["training"]["batch"],
            "imgsz": config["training"]["imgsz"],
            "device": args.device,
            "project": project_dir,
            "name": isolated_run_name,
            "resume": resume_training
        }
        
        # Some detectors use different kwarg names, adapting based on signature
        import inspect
        sig = inspect.signature(detector.train)
        if "dataset_path" in sig.parameters:
            train_kwargs["dataset_path"] = dataset_yaml
        else:
            train_kwargs["dataset_yaml"] = dataset_yaml
            
        if "learning_rate" in sig.parameters:
            train_kwargs["learning_rate"] = config["training"]["learning_rate"]
            
        if "callbacks" in sig.parameters:
            train_kwargs["callbacks"] = [cb]
            
        final_metrics = detector.train(**train_kwargs)
        train_time = time.time() - t0

        # MLflow: Log Results
        try:
            best_pt = detector.get_best_weights_path()
        except AttributeError:
            best_pt = os.path.join(project_dir, isolated_run_name, "weights", "best.pt")
            
        try:
            log_run_results(config, final_metrics, train_time, cb, best_pt, isolated_run_name)
        except Exception as e:
            print(f"[train] WARNING: Could not log full results via logger: {e}")
            if final_metrics: mlflow.log_metrics(final_metrics)

        if os.path.exists(best_pt):
            try:
                save_model(best_pt, config, output_model_name)
            except Exception:
                pass
        else:
            print(f"[train] WARNING: best.pt not found at {best_pt}, skipping promotion")

        print(f"\n[train] ✓ run_id={run.info.run_id} time={train_time:.0f}s")
        
        # Write marker file to indicate training has finished completely
        complete_marker = os.path.join(project_dir, isolated_run_name, ".train_complete")
        with open(complete_marker, "w") as f:
            f.write("done\n")

if __name__ == "__main__":
    main()