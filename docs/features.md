# Self-Service Model Training Platform — Features

## 1. Model Selection
- Choose from multiple base object-detection models (e.g. YOLOv8n / YOLOv8s / YOLOv8m)
- View at-a-glance info per model (size, speed/accuracy tradeoff) to inform the choice

## 2. Dataset Management
- Point to an existing base dataset via local path (no uploads)
- Add new images/labels to extend the base dataset via local path
- One-click background-image injection as a dataset augmentation option
- Automatic dataset validation before training:
  - Correct folder/file structure for the selected model
  - Valid, readable image files
  - Correctly formatted labels with valid class indices
  - Consistent class definitions across base + new data
- Clear, upfront error reporting if validation fails — nothing bad reaches training
- Dataset summary preview (image count, class balance) before confirming a run

## 3. Training Configuration
- Full control over epochs, batch size, learning rate, image size, and train/val split
- Sensible defaults pre-filled, with input validation on submit
- Optional run name/tag for easy identification later
- **Remembers your last-used configuration** automatically — no re-entering the
  same settings every time
- One-click reset back to system defaults if needed

## 4. Flexible Run Scheduling
- Run training immediately, or
- Set up a **recurring schedule** (e.g. every N hours, or a cron expression) for
  automatic retraining as new data comes in, or
- Schedule a **one-time future run**
- View, edit, or cancel any active schedule

## 5. Local or Remote GPU Training
- Choose per run whether training happens on your local machine or a remote GPU
- Save and reuse **named remote GPU profiles** (e.g. "Lab GPU," "Runpod A100") —
  no re-entering connection details each time
- Automatic transfer of dataset/weights/script to the remote target and retrieval
  of results once training completes
- Clear, distinct error reporting for remote-specific failures (e.g. connection
  lost, out of memory)

## 6. Automated Pipeline Orchestration (Airflow)
- Every run automatically merges the dataset, executes training with your exact
  config, and logs everything — no manual pipeline steps
- Built-in sanity re-check before execution, protecting scheduled/delayed runs
  from acting on stale or since-changed dataset paths

## 7. Experiment Tracking (MLflow)
- Every run automatically logs parameters, metrics, and sample prediction images
- Best-performing model per run is automatically registered for use in inference
- In-app at-a-glance status summary for any run (pending/running/success/failed)
- One-click **"Open in Airflow"** and **"Open in MLflow"** buttons for full live
  tracking, logs, and metric comparisons in their native dashboards

## 8. Run History
- Every run automatically saved — persists across app restarts
- Sortable/filterable history view (by date, model, or status)
- One-click reload of any past run's configuration to rerun or tweak
- Delete old/unwanted history entries

## 9. Inference
- Select any registered model version to run inference with
- Point to a local image or video file (path or file picker — no uploads)
- View detections with bounding boxes, class labels, and confidence scores
- See total inference time for every request

## 10. Platform
- Runs entirely locally — no cloud hosting, no data leaving your machine unless
  you explicitly choose remote GPU training
- Fast, familiar React-based interface
- Lightweight Postgres-backed persistence for history, configs, and GPU profiles
