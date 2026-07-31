import argparse
import os
import shutil
import yaml

MANIFEST_FILE = ".injected_manifest.txt"


def _resolve_train_images_dir(dataset_path: str) -> str:
    """Find the train/images directory from a YOLO dataset path."""
    
    if dataset_path.endswith(".yaml") or dataset_path.endswith(".yml"):
        yaml_path = dataset_path
        dataset_path = os.path.dirname(yaml_path)
    else:
        yaml_path = None
        for name in ("data.yaml", "dataset.yaml"):
            p = os.path.join(dataset_path, name)
            if os.path.exists(p):
                yaml_path = p
                break

    if yaml_path and os.path.exists(yaml_path):
        with open(yaml_path) as f:
            cfg = yaml.safe_load(f)
        train_val = str(cfg.get("train", "train/images"))
        if os.path.isabs(train_val):
            return train_val
        if train_val.startswith("../"):
            train_val = train_val[3:]
        return os.path.normpath(os.path.join(dataset_path, train_val))

    # Fallback: look for common directory structures
    for candidate in ("train/images", "images/train"):
        p = os.path.join(dataset_path, candidate)
        if os.path.isdir(p):
            return p

    raise FileNotFoundError(
        f"Cannot locate train images directory in {dataset_path}. "
        "Expected data.yaml with a 'train' key, or a train/images/ folder."
    )


def inject(source_dir: str, dataset_path: str) -> list[str]:
    """Copy background images from source_dir into the dataset's train/images."""
    target_dir = _resolve_train_images_dir(dataset_path)

    manifest_path = os.path.join(target_dir, MANIFEST_FILE)
    if os.path.exists(manifest_path):
        print(f"[inject] Found existing manifest at {manifest_path}. Running recovery cleanup first...")
        cleanup(dataset_path)

    if not os.path.isdir(source_dir):
        raise FileNotFoundError(f"Background images source directory not found: {source_dir}")

    os.makedirs(target_dir, exist_ok=True)

    image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
    injected = []

    for fname in sorted(os.listdir(source_dir)):
        ext = os.path.splitext(fname)[1].lower()
        if ext not in image_exts:
            continue

        src = os.path.join(source_dir, fname)
        dst = os.path.join(target_dir, fname)

        # Avoid overwriting original dataset images — prefix if collision
        if os.path.exists(dst):
            base, ext_ = os.path.splitext(fname)
            fname = f"_bg_{base}{ext_}"
            dst = os.path.join(target_dir, fname)
            counter = 2
            while os.path.exists(dst):
                fname = f"_bg{counter}_{base}{ext_}"
                dst = os.path.join(target_dir, fname)
                counter += 1

        shutil.copy2(src, dst)
        injected.append(fname)

        # Write manifest incrementally (crash-safe)
        with open(manifest_path, "a") as f:
            f.write(fname + "\n")

    print(f"[inject] Injected {len(injected)} background images from {source_dir} -> {target_dir}")
    return injected


def cleanup(dataset_path: str) -> int:
    """Remove previously injected images using the manifest file."""
    target_dir = _resolve_train_images_dir(dataset_path)

    manifest_path = os.path.join(target_dir, MANIFEST_FILE)
    if not os.path.isfile(manifest_path):
        print(f"[cleanup] No manifest found at {manifest_path}, nothing to clean.")
        return 0

    with open(manifest_path) as f:
        injected = [line.strip() for line in f if line.strip()]

    removed = 0
    for fname in injected:
        fpath = os.path.join(target_dir, fname)
        if os.path.exists(fpath):
            os.remove(fpath)
            removed += 1

    os.remove(manifest_path)
    print(f"[cleanup] Removed {removed}/{len(injected)} injected images from {target_dir}")
    return removed


def main():
    parser = argparse.ArgumentParser(description="Inject/cleanup background images for YOLO datasets")
    subparsers = parser.add_subparsers(dest="action", required=True)

    p_inject = subparsers.add_parser("inject", help="Copy background images into train/images")
    p_inject.add_argument("--source_dir", required=True, help="Folder containing background images")
    p_inject.add_argument("--dataset_path", required=True, help="Root of the YOLO dataset")

    p_cleanup = subparsers.add_parser("cleanup", help="Remove previously injected images")
    p_cleanup.add_argument("--dataset_path", required=True, help="Root of the YOLO dataset")

    args = parser.parse_args()

    if args.action == "inject":
        inject(args.source_dir, args.dataset_path)
    elif args.action == "cleanup":
        cleanup(args.dataset_path)


if __name__ == "__main__":
    main()
