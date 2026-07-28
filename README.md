# VisionOps

A self-service, adapter-based MLOps platform for training, tracking, and running
inference on computer vision object-detection models — built on Airflow, MLflow,
and a pluggable model backend so new architectures (YOLO, Hugging Face, or fully
custom) can be added without touching the rest of the pipeline.

---

## Overview

VisionOps lets a user pick a base detection model, extend a training dataset
(with automatic format validation and background-image augmentation), configure
hyperparameters, and launch a training run — either on the local machine or a
remote GPU — without touching a CLI or manually editing scripts. Every run is
automatically orchestrated through Airflow, tracked in MLflow, and saved to a
persistent run history, so past configurations, datasets, and results are never
lost or forgotten between sessions.

The platform is built around a `BaseDetector` adapter interface: every
supported model family (Ultralytics YOLO, Hugging Face transformers, or any
custom architecture) implements the same `load`, `train`, `infer`, and
`get_metadata` methods. This means the dataset pipeline, Airflow DAG, and
inference API never need to know which specific framework is running
underneath — new model support can be added by dropping in a new detector file,
auto-discovered by a model registry, with no changes required elsewhere in the
system.

---

## Features

- Select from multiple base detection model architectures
- Extend datasets via local path (no uploads) with automatic format validation
  and optional background-image injection
- Fully configurable training runs (epochs, batch size, learning rate, image
  size, train/val split), with your last-used configuration remembered
  automatically
- Run training immediately, on a recurring schedule, or at a future scheduled
  time
- Train locally or on a remote GPU using saved, reusable connection profiles
- Automatic Airflow orchestration of dataset merging, training, and metric
  logging
- Full experiment tracking via MLflow, with in-app status summaries and
  one-click deep links into Airflow's and MLflow's native dashboards
- Persistent, filterable run history — reload any past configuration in one
  click
- Inference on any registered model version, with bounding boxes, confidence
  scores, and inference timing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | FastAPI |
| Orchestration | Apache Airflow |
| Experiment Tracking / Model Registry | MLflow |
| Database | PostgreSQL |
| Model Training | Ultralytics YOLO, Hugging Face Transformers, or custom (via adapter pattern) |

---
