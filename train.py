import argparse
import json
import os
import mlflow
from typing import Dict, Any

from detectors.registry import registry

def parse_args():
    parser = argparse.ArgumentParser(description="VisionOps Training Script")
    parser.add_argument("--config", type=str, help="Path to JSON config file")
    parser.add_argument("--model-name", type=str, help="Name of the model (e.g. yolov8n)")
    parser.add_argument("--dataset-path", type=str, help="Path to the training dataset")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=0.01)
    parser.add_argument("--image-size", type=int, default=640)
    parser.add_argument("--device", type=str, default="")
    parser.add_argument("--run-name", type=str, default="visionops_run")
    parser.add_argument("--run-id", type=int, help="VisionOps DB Run ID for tracking correlation")
    
    return parser.parse_args()

def load_config(args) -> Dict[str, Any]:
    config = {}
    if args.config and os.path.exists(args.config):
        with open(args.config, 'r') as f:
            config = json.load(f)
            
    # Override with CLI args if provided
    for key, value in vars(args).items():
        if value is not None and key != 'config':
            config[key] = value
            
    return config

def main():
    args = parse_args()
    config = load_config(args)
    
    model_name = config.get("model_name")
    dataset_path = config.get("dataset_path")
    epochs = config.get("epochs")
    batch_size = config.get("batch_size")
    lr = config.get("learning_rate")
    img_size = config.get("image_size")
    device = config.get("device", "")
    run_name = config.get("run_name", "visionops_run")
    visionops_run_id = config.get("run_id")
    
    if not model_name or not dataset_path:
        raise ValueError("model_name and dataset_path are required.")
        
    print(f"Starting training for {model_name} on dataset {dataset_path}...")
    
    # Instantiate the correct detector via the registry
    detector = registry.get_detector(model_name)
    
    # Initialize MLflow run
    mlflow.set_experiment("visionops_training")
    with mlflow.start_run(run_name=run_name) as run:
        # Log parameters
        mlflow.log_params({
            "model_name": model_name,
            "dataset_path": dataset_path,
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": lr,
            "image_size": img_size,
            "visionops_run_id": str(visionops_run_id) if visionops_run_id else None
        })
        
        # Run training loop
        metrics = detector.train(
            dataset_path=dataset_path,
            epochs=epochs,
            batch_size=batch_size,
            learning_rate=lr,
            img_size=img_size,
            device=device,
            name=run_name
        )
        
        # Log metrics to MLflow
        if metrics:
            mlflow.log_metrics(metrics)
            
        print(f"Training completed successfully. Metrics: {metrics}")
        
if __name__ == "__main__":
    main()
