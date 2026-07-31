import argparse, os, yaml

def _resolve_yaml_content(yaml_file, ds_dir):
    with open(yaml_file) as f:
        cfg = yaml.safe_load(f)

    cfg["path"] = ds_dir

    for key in ("train", "val", "test"):
        if not cfg.get(key):
            continue
            
        val = os.path.normpath(str(cfg[key])).replace("\\", "/")
        parts = val.split("/")
        cfg[key] = "/".join(parts[-2:]) if len(parts) >= 2 else parts[-1]

    with open(yaml_file, "w") as f:
        yaml.dump(cfg, f, default_flow_style=False)

    return yaml_file


def discover_and_resolve_dataset(incoming_dir, stream_type=None, config_file=None):
    # Check config file first for explicit mapping like thermal_dataset
    if config_file and os.path.isfile(config_file) and stream_type:
        try:
            with open(config_file) as f:
                app_cfg = yaml.safe_load(f)
            cfg_ds = app_cfg.get("data", {}).get(f"{stream_type}_dataset")
            if cfg_ds:
                if not os.path.exists(cfg_ds):
                    cfg_ds = os.path.join(incoming_dir, os.path.basename(cfg_ds))
                if os.path.isdir(cfg_ds):
                    candidate_yaml = os.path.join(cfg_ds, "data.yaml")
                    if os.path.isfile(candidate_yaml):
                        print(f"[preprocess] Using configured {stream_type}_dataset from config: {cfg_ds}")
                        return _resolve_yaml_content(candidate_yaml, cfg_ds)
        except Exception as e:
            print(f"[preprocess] Warning: Failed reading config {config_file}: {e}")

    if not os.path.isdir(incoming_dir):
        return None

    # Check sub-directories first
    yaml_file, ds_dir = None, None
    for entry in sorted(os.listdir(incoming_dir)):
        if stream_type and stream_type.lower() not in entry.lower():
            continue
        candidate = os.path.join(incoming_dir, entry)
        candidate_yaml = os.path.join(candidate, "data.yaml")
        if os.path.isdir(candidate) and os.path.isfile(candidate_yaml):
            ds_dir, yaml_file = candidate, candidate_yaml
            break

    # Fallback: data.yaml directly in incoming/
    if not yaml_file:
        candidate_yaml = os.path.join(incoming_dir, "data.yaml")
        if os.path.isfile(candidate_yaml):
            ds_dir, yaml_file = incoming_dir, candidate_yaml

    if not yaml_file:
        return None

    return _resolve_yaml_content(yaml_file, ds_dir)


def main():
    parser = argparse.ArgumentParser(
        description="Preprocess / resolve dataset for the training pipeline."
    )
    parser.add_argument(
        "--dataset_yaml", default=None,
        help="Explicit dataset YAML path (e.g. coco128.yaml). "
             "If omitted, auto-discover from --incoming_dir."
    )
    parser.add_argument(
        "--incoming_dir", default="/data/incoming",
        help="Directory to scan for user-provided datasets."
    )
    parser.add_argument(
        "--stream_type", default=None,
        help="Optional keyword (e.g. 'thermal' or 'visual') to match dataset folder name."
    )
    parser.add_argument(
        "--config", default="config/pipeline_config.yaml",
        help="Path to pipeline config YAML."
    )
    args = parser.parse_args()

    if args.dataset_yaml:
       
        resolved_yaml = args.dataset_yaml
        print(f"[preprocess] Using explicit dataset: {resolved_yaml}")
    else:
        
        resolved_yaml = discover_and_resolve_dataset(args.incoming_dir, stream_type=args.stream_type, config_file=args.config)
        if resolved_yaml is None:
            raise FileNotFoundError(
                f"No dataset found in {args.incoming_dir}. "
                "Place a folder containing data.yaml + images/ + labels/ there, "
                "or pass --dataset_yaml explicitly."
            )
        print(f"[preprocess] Discovered and resolved dataset at: {resolved_yaml}")

    # Write marker file
    marker = os.path.join(args.incoming_dir, ".dataset_yaml_path")
    with open(marker, "w") as f:
        f.write(resolved_yaml)

    print(f"DATASET_YAML={resolved_yaml}")
    print(f"[preprocess] done.")


if __name__ == "__main__":
    main()