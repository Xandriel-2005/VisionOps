# Self-Service Model Training Platform — System Design

## 1. Overview

The system lets a user select a base object-detection model, extend a dataset
(with validation and background-image injection), configure training
hyperparameters, launch training locally or on a remote GPU via Airflow, track
runs (with deep links into Airflow/MLflow's native UIs), and run inference from
any registered model version — all through a React frontend backed by a FastAPI
service, with Postgres as the persistence layer.

---

## 2. Components

### 2.1 Frontend — React + Vite
Locally served web app (accessed via localhost). Pages: Model Selection, Dataset,
Config, Launch, Tracking, Inference. Communicates with the backend over local
HTTP. Uses native file/folder pickers or path input fields — no file uploads.

### 2.2 Backend — FastAPI
Central orchestration/mediation layer. Does not run training itself. Responsible
for:
- Filesystem access: browsing folders, resolving paths
- **Full dataset validation** (structure, image/label integrity, class
  consistency) before any DAG is triggered — fail fast, cheap
- Config persistence: save/load last-used config, run history (Postgres)
- Remote GPU profile management (save/list/select named connection profiles)
- Airflow integration: trigger DAG runs (immediate or scheduled) via Airflow's
  REST API; fetch on-demand run status
- MLflow integration: fetch run summaries/metrics for the in-app status view;
  construct deep-link URLs into MLflow's native UI
- Inference endpoint: load a model from the MLflow registry, run detection on a
  given local file path, return results + timing

### 2.3 Airflow
Owns pipeline execution as DAG tasks:
1. **Lightweight sanity re-check** (first task) — confirms dataset path/state
   still looks valid (file counts, expected structure) since some time may have
   passed since FastAPI's full validation, especially for scheduled runs
2. Merge dataset (base + newly added + background-injected images)
3. Run training script with config passed in as DAG run `conf`
4. If remote GPU selected: handle SSH/transfer to remote target, wait for
   completion, retrieve trained weights + metrics back
5. Log results to MLflow
6. Register best-performing model in the MLflow Model Registry

Supports both immediate triggering and recurring/one-time scheduled runs.

### 2.4 MLflow
Tracking server + Model Registry. Source of truth for run metrics, artifacts,
and the current best/registered model versions. Its native UI is used directly
for detailed run comparison (no duplication of this inside the app).

### 2.5 Postgres
Persistence layer for everything Airflow/MLflow don't own:
- **Run history table**: timestamp, model, dataset reference/version, full
  config, run mode (local/remote), status, linked MLflow run ID, linked Airflow
  DAG run ID
- **Last-used config**: pre-fills the config form on next launch
- **Remote GPU connection profiles**: named profiles (e.g. "Lab GPU," "Runpod
  A100") storing host, port, username, SSH key path (key-based auth only — no
  plaintext passwords)

### 2.6 Training Execution Target
Selected per run: local machine, or a remote GPU reached via SSH using a saved
connection profile (or manually entered details).

---

## 3. Tracking Approach (no live-update layer needed)

The in-app Tracking page shows a simple **on-demand status summary**
(pending/running/success/failed + last-known metric snapshot), refreshed on
page load or a manual "Refresh" button — no SSE, no WebSockets, no polling
loop in the app itself.

For detailed, genuinely live tracking, the app provides direct deep links:
- **"Open in Airflow"** → links to the specific DAG run's grid/graph view in
  Airflow's own UI (live task status, logs, retries, Gantt chart)
- **"Open in MLflow"** → links to the specific run in MLflow's own UI (live
  metric charts, artifacts, comparisons)

Rationale: Airflow and MLflow already provide mature, live-updating UIs for
this exact purpose. Rebuilding that inside the app would duplicate
functionality without adding value — the app's job is configuration, dataset
handling, launching, and inference, using Airflow/MLflow as the systems of
record for execution and experiment tracking.

---

## 4. Data Flow — One Full Training Run

1. User fills Dataset + Config + Launch pages in React → request sent to
   FastAPI.
2. FastAPI runs full dataset validation. If invalid, returns an error
   immediately — no DAG run is created, no Airflow/Postgres state is touched.
3. FastAPI writes a run row to Postgres (status: `pending`), then either:
   - Calls the Airflow REST API to trigger the DAG immediately with the config
     as `conf`, or
   - Registers a schedule (recurring or one-time future run) per the user's
     selection.
4. Airflow DAG executes: sanity re-check → merge dataset → train (local or via
   SSH to the selected remote profile) → log to MLflow → register model.
5. FastAPI updates the Postgres run row's status based on on-demand checks
   against Airflow (`pending → running → success/failed`).
6. Tracking page shows the current status summary; user can click through to
   Airflow/MLflow for live, detailed views.
7. On success, the newly registered model version becomes selectable on the
   Inference page.

---

## 5. Key Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| Full dataset validation in FastAPI, before DAG trigger | Fast feedback to the user; keeps invalid input from ever becoming a DAG run/Airflow failure; separation of concerns (Airflow orchestrates valid pipelines, doesn't police input) |
| Lightweight sanity re-check as first Airflow task | Defense in depth — dataset state could change between validation and actual execution, especially for scheduled runs |
| No SSE/WebSockets/polling for tracking | Airflow and MLflow already provide live, detailed tracking UIs; deep-linking avoids duplicating that work |
| Postgres over SQLite | User already has production experience with Postgres across other projects; also leaves room to grow beyond single-user local use later |
| Path-based dataset/file references, no uploads | Avoids upload delay and in-browser memory overhead for large datasets; backend/native pickers resolve local paths directly |
| React + Vite frontend, FastAPI backend | Matches user's existing frontend experience; FastAPI is lightweight and a natural fit for a Python-based orchestration layer |
| Remote GPU as a per-run user choice, with saved named profiles | Matches the internship's real workflow (remote GPU training) while keeping it convenient across repeated runs |
| Desktop packaging (e.g. Tauri) deferred | Not required for the initial build; can be added later without re-architecting the frontend/backend split |

---

## 6. Architecture Diagram

```
React + Vite (local frontend)
        │  HTTP
        ▼
FastAPI backend
   ├── Dataset validation (full, pre-trigger)
   ├── Postgres
   │     ├── Run history
   │     ├── Last-used config
   │     └── Remote GPU connection profiles
   ├── Airflow REST API ──► Airflow DAG
   │                          ├── Sanity re-check
   │                          ├── Dataset merge
   │                          ├── Train (local or SSH → remote GPU)
   │                          └── Log + register model ──► MLflow
   ├── On-demand status fetch ◄── Airflow / MLflow
   ├── Deep links ──► Airflow UI (live tracking)
   ├── Deep links ──► MLflow UI (live tracking)
   └── Inference endpoint ◄── loads model from MLflow Registry
```
