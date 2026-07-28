# Self-Service Model Training Platform — Tech Stack

## 1. Frontend
- **Framework:** React (with Vite as the build tool/dev server)
- **Rendering mode:** Locally served web app (accessed via localhost), not deployed
  publicly
- **File/path input:** Native file/folder picker where supported, or path input
  fields resolved via backend endpoints — no browser file uploads for datasets
- **Packaging:** Native desktop packaging (e.g. via Tauri) is deferred to a later
  phase; not required for the initial build

## 2. Backend
- **Framework:** Python — FastAPI
- **Responsibilities:**
  - Filesystem access (reading/validating dataset paths, browsing folders)
  - Dataset format validation before training
  - Triggering and monitoring Airflow DAG runs (via Airflow REST API)
  - Querying MLflow (runs, metrics, artifacts, model registry)
  - Serving inference requests (loading models from MLflow registry)
  - Reading/writing persisted state in Postgres (run history, last-used config,
    remote GPU connection profiles)

## 3. Orchestration
- **Tool:** Apache Airflow
- **Usage:** DAGs handle dataset merge (base + new + background-injected images),
  training script execution with dynamic config, and logging results to MLflow
- **Scheduling:** Supports both on-demand (immediate trigger) and recurring/one-time
  scheduled runs, configurable per run rather than fixed at DAG definition

## 4. Experiment Tracking & Model Registry
- **Tool:** MLflow (Tracking Server + Model Registry)
- **Usage:** Logs run parameters, metrics, and artifacts (including sample
  prediction images) for every training run; registers best-performing models for
  use in inference

## 5. Model Training
- **Framework:** Ultralytics YOLO (or equivalent detection framework) for base
  models (e.g. YOLOv8n / YOLOv8s / YOLOv8m)
- **Execution environment:** User-selectable per run —
  - **Local machine**, or
  - **Remote GPU** (connected via SSH / pre-configured remote profile), with
    weights/metrics retrieved back after training completes

## 6. Inference Serving
- **Approach:** Backend (FastAPI) loads the selected model version directly from
  the MLflow Model Registry and runs detection on a user-specified local
  image/video path or picker input

## 7. Persistence
- **Database:** PostgreSQL
- **Stores:**
  - Run history (timestamp, model, dataset reference/version, full config, run
    mode, status, linked MLflow/Airflow run IDs)
  - Last-used configuration (for pre-filling the config form on next launch)
  - Remote GPU connection profiles (name, host, port, username, SSH key path)

## 8. Dataset Validation
- **Approach:** Custom validation logic in the backend (Python), checking:
  - Directory/file structure against the expected format for the selected model
    (e.g. YOLO layout: images/, labels/, data.yaml)
  - Image file validity and supported types
  - Label file presence, format correctness, and valid class indices
  - Class definition consistency across base and newly added data

## 9. Summary Diagram
```
React + Vite (local web frontend)
        │  (HTTP requests)
        ▼
FastAPI backend
   ├── Filesystem access & dataset validation
   ├── Postgres (run history, last-used config, remote GPU profiles)
   ├── Airflow REST API  ──► Airflow DAGs ──► Training (local or remote GPU)
   │                                              │
   │                                              ▼
   │                                          MLflow (tracking + registry)
   └── Inference endpoint  ◄── loads model from MLflow Registry
```
