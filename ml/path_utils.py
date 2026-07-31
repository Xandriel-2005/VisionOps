import os
import shutil

def resolve_path(path: str) -> str:
    if path and path.startswith("/") and os.environ.get("IS_REMOTE") == "1":
        return path.lstrip("/")
    return path

def auto_resolve_dataset_yaml(config: dict) -> str:
    incoming_dir = resolve_path(config.get("data", {}).get("incoming_dir", "/data/incoming"))
    resolved_path_file = os.path.join(incoming_dir, ".dataset_yaml_path")

    if not os.path.isfile(resolved_path_file):
        raise ValueError(
            f"No auto-resolved dataset path found at {resolved_path_file}. "
            "Run preprocess first or pass --dataset_yaml."
        )

    with open(resolved_path_file) as f:
        dataset_yaml = resolve_path(f.read().strip())
    print(f"[train] Auto-resolved dataset_yaml: {dataset_yaml}")
    return dataset_yaml

def resolve_weights(config: dict) -> tuple[str, str]:
    configured_weights = config["training"].get("weights", config["training"].get("base_weights"))
    if not configured_weights:
        raise ValueError("No weights configured")
        
    configured_weights = resolve_path(configured_weights)
    
    # Check if the user passed a plain filename (e.g. yolov8n.pt) and if it exists locally in the mounted folder
    if not os.path.isabs(configured_weights) and not configured_weights.startswith("http"):
        local_path = os.path.join("/opt/airflow/models/weights", configured_weights)
        if os.path.exists(local_path):
            configured_weights = local_path
            
    model_stem = os.path.splitext(os.path.basename(configured_weights))[0]

    print(f"[train] Using base weights: {configured_weights}")
    return configured_weights, model_stem

def save_model(best_pt: str, config: dict, output_name: str) -> None:       
    trained_dir = resolve_path(config["training"].get("trained_models_dir", "trained_models"))
    os.makedirs(trained_dir, exist_ok=True)
    out_path = os.path.join(trained_dir, f"{output_name}.pt")
    shutil.copy2(best_pt, out_path)
    print(f"[train] ✓ Saved → {out_path}")
