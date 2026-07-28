# Self-Service Model Training Platform — Requirements

## 1. Model Selection Requirements
- REQ1.0: The system shall consist of a React + Vite frontend (locally served, not
  deployed publicly) communicating with a local Python backend (e.g. FastAPI) that
  handles filesystem access, Airflow triggering, MLflow queries, and run
  history/config persistence (local SQLite database).
- REQ1.0.1: The system shall use path-based dataset/file references rather than
  browser file uploads. Since browsers cannot read arbitrary local filesystem paths
  directly, the backend shall expose endpoints for browsing/validating local paths
  (or the frontend shall use a native file/folder picker where supported), so the
  user selects paths without routing file contents through an upload step.
- REQ1.0.2: Packaging the frontend as a native desktop app (e.g. via Tauri) is
  deferred to a later phase and is not required for the initial build.
- REQ1.1: The system shall support at least 2–3 base object-detection models
  (e.g. YOLOv8n, YOLOv8s, YOLOv8m) to choose from.
- REQ1.2: Each model option shall display identifying info (name, size/speed tradeoff)
  so the user can make an informed choice.
- REQ1.3: The system shall record which base model was selected as part of the run's
  metadata/config.

## 2. Dataset Requirements
- REQ2.1: The system shall display the current base dataset (image count, class
  distribution, sample thumbnails) by reading it from a user-specified local path.
- REQ2.2: The user shall be able to add new images by specifying a local folder path
  rather than uploading files through a browser.
- REQ2.3: The system shall support associating label files (via local path) with
  newly added images, or provide an auto-labeling path if manual labeling is not used.
- REQ2.4: The system shall provide a toggle/option to inject background images
  (referenced by local path) into the dataset as an augmentation step.
- REQ2.5: The system shall merge the base dataset with newly added (and optionally
  background-injected) images into a single training-ready dataset, working directly
  off disk paths rather than copying data through the application memory.
- REQ2.6: The system shall show a summary of the merged dataset (total image count,
  class balance) before the user confirms training.
- REQ2.7: The system shall version or tag each merged dataset so a given training run
  can be traced back to the exact dataset used.
- REQ2.8: The system shall validate the dataset format before accepting it for
  training, including:
  - REQ2.8.1: Verifying folder/file structure matches the expected format for the
    selected model (e.g. YOLO directory layout: images/, labels/, data.yaml).
  - REQ2.8.2: Verifying image files are valid, readable, and of supported types
    (e.g. .jpg, .png).
  - REQ2.8.3: Verifying label files are present, correctly formatted, and reference
    valid class indices for each corresponding image.
  - REQ2.8.4: Verifying class definitions (e.g. data.yaml / classes.txt) are
    consistent across the base dataset and any newly added data.
  - REQ2.8.5: Flagging and reporting mismatched, missing, or corrupt files with
    clear error messages before a training run is allowed to start.
- REQ2.9: The system shall reject a training run and notify the user if dataset
  validation fails, rather than passing bad data into the Airflow DAG.

## 3. Training Configuration Requirements
- REQ3.1: The user shall be able to set the number of epochs.
- REQ3.2: The user shall be able to set the batch size.
- REQ3.3: The user shall be able to set the learning rate.
- REQ3.4: The user shall be able to set the input image size.
- REQ3.5: The user shall be able to set the train/validation split ratio.
- REQ3.6: All configuration fields shall have sensible default values pre-filled.
- REQ3.7: The system shall validate configuration inputs (e.g. epochs > 0, valid
  split ratio range) before allowing submission.
- REQ3.8: The user shall be able to name/tag a run for identification.
- REQ3.9: The user shall be able to choose the run mode: "run now" (immediate trigger)
  or "schedule" (recurring/future trigger).
- REQ3.10: If "schedule" is selected, the user shall be able to define a recurring
  schedule (e.g. every N hours, or a cron expression) for automatic retraining.
- REQ3.11: If "schedule" is selected, the user shall alternatively be able to pick a
  single future date/time for a one-time scheduled run.
- REQ3.12: The system shall allow the user to view, edit, and cancel any active
  schedule associated with a DAG.
- REQ3.13: The system shall persist the most recently used configuration (model,
  dataset reference, epochs, batch size, learning rate, image size, split ratio,
  run mode) locally, and pre-fill the config page with these values on next launch,
  rather than resetting to blank/generic defaults.
- REQ3.14: The user shall be able to reset the config page back to system defaults
  if desired, overriding the remembered last-used config.

## 3A. Run History Requirements
- REQ3A.1: The system shall persist a record of every training run locally
  (surviving app restarts), including: timestamp, selected model, dataset
  version/reference, full config used, run mode (local/remote), and final status
  (success/failed/running).
- REQ3A.2: The system shall link each stored run record to its corresponding MLflow
  run ID and Airflow DAG run ID for cross-referencing detailed metrics/logs.
- REQ3A.3: The user shall be able to view a list/table of past runs within the app,
  sortable/filterable by date, model, or status.
- REQ3A.4: The user shall be able to re-load a past run's configuration (e.g. to
  rerun with the same settings or use as a starting point for a new run).
- REQ3A.5: The user shall be able to delete individual run history entries.

## 4. Training Execution Requirements
- REQ4.1: The system shall trigger an Airflow DAG run when the user starts training,
  passing the selected model, dataset reference, and config as a structured payload.
- REQ4.2: The Airflow DAG shall perform dataset merge, run the training script with
  the given config, and log results to MLflow — without manual intervention.
- REQ4.3: The system shall confirm to the user that a run has started, including a
  run/DAG identifier.
- REQ4.4: The user shall be able to explicitly choose whether a training run executes
  on the local machine or on a remote GPU.
  - REQ4.4.1: If remote GPU is selected, the user shall be able to specify/select
    connection details (e.g. host, credentials, or a pre-configured remote profile).
  - REQ4.4.2: The system shall transfer only the required dataset reference,
    base weights, and training script to the remote machine directly via file
    paths/SSH, consistent with the local-path-based design (no intermediate
    in-app upload step).
  - REQ4.4.3: The system shall retrieve trained weights and metrics back from the
    remote GPU once training completes, for MLflow logging.
  - REQ4.4.4: The system shall surface remote execution status/failures (e.g.
    connection lost, out of memory) distinctly from local execution errors.

## 5. Tracking & Metrics Requirements
- REQ5.1: The user shall be able to view Airflow DAG run status (queued, running,
  success, failed) from the frontend.
- REQ5.2: The user shall be able to view Airflow task logs for a given run.
- REQ5.3: The system shall automatically log run parameters, metrics, and artifacts
  to MLflow for every training run.
- REQ5.4: The user shall be able to view a list of past MLflow runs with their
  metrics (e.g. loss, mAP, precision/recall).
- REQ5.5: The user shall be able to compare two or more MLflow runs side by side.
- REQ5.6: The system shall log sample prediction images per run to MLflow for visual
  comparison.
- REQ5.7: The system shall register the best-performing model of a run in the MLflow
  Model Registry.

## 6. Inference Requirements
- REQ6.1: The user shall be able to select any registered model version for
  inference.
- REQ6.2: The user shall be able to specify a local image or video file (via file
  path or file picker) to run inference on.
- REQ6.3: The system shall return detection results including bounding boxes, class
  labels, and confidence scores.
- REQ6.4: The system shall display total inference time for the submitted input.

## 7. Non-Functional Requirements
- REQ7.1 (Usability): All actions — model selection, dataset configuration,
  training configuration, launching training, tracking, and inference — shall be
  reachable via the application UI without requiring manual file/script edits
  outside the app.
- REQ7.2 (Reliability): Failed Airflow DAG runs shall surface a visible error state
  in the UI rather than failing silently.
- REQ7.3 (Reproducibility): Every training run shall be traceable to its exact
  config, dataset version, and resulting metrics via MLflow.
- REQ7.4 (Performance visibility): Inference response time shall always be shown to
  the user alongside results.
- REQ7.5 (Demo readiness): The system shall support pre-populated MLflow runs so
  the tracking/comparison UI is meaningful even without a freshly completed run.

## 8. Constraints / Out of Scope
- Image generation / GenAI features are out of scope for this project.
- Multi-user authentication and role management are out of scope.
- Production-grade scaling, load balancing, and CI/CD are out of scope.
