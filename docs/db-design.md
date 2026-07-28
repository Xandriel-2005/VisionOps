# Self-Service Model Training Platform — Database Design

## 1. Scope

This document covers **only the application's own Postgres database** — it does
NOT cover MLflow's backend store or Airflow's metadata database, both of which
manage their own internal schemas automatically. This app-owned database stores
run history, last-used configuration, and remote GPU connection profiles, and
references MLflow/Airflow runs by ID rather than duplicating their data.

Recommended: a dedicated database (e.g. `training_platform`) or at least a
dedicated schema, kept separate from MLflow's and Airflow's own Postgres
databases even if they share the same Postgres server instance.

---

## 2. Tables

### 2.1 `remote_gpu_profiles`
Stores saved connection details for remote GPU targets, so the user doesn't
re-enter them per run.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` / `UUID` | PRIMARY KEY | |
| `name` | `VARCHAR(100)` | NOT NULL, UNIQUE | e.g. "Lab GPU", "Runpod A100" |
| `host` | `VARCHAR(255)` | NOT NULL | hostname or IP |
| `port` | `INTEGER` | NOT NULL, DEFAULT 22 | SSH port |
| `username` | `VARCHAR(100)` | NOT NULL | |
| `ssh_key_path` | `TEXT` | NOT NULL | path to private key; key-based auth only, no stored passwords |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | |
| `last_used_at` | `TIMESTAMPTZ` | NULLABLE | updated when profile is used in a run |

---

### 2.2 `last_used_config`
Single-row (or single-row-per-user, if ever multi-user) table holding the most
recent configuration, used to pre-fill the Config page on next launch.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` | PRIMARY KEY | in practice only ever 1 row for a single-user local app |
| `model_name` | `VARCHAR(50)` | NOT NULL | e.g. "yolov8n" |
| `dataset_path` | `TEXT` | NOT NULL | |
| `use_bg_injection` | `BOOLEAN` | NOT NULL, DEFAULT false | |
| `epochs` | `INTEGER` | NOT NULL | |
| `batch_size` | `INTEGER` | NOT NULL | |
| `learning_rate` | `REAL` | NOT NULL | |
| `image_size` | `INTEGER` | NOT NULL | |
| `train_val_split` | `REAL` | NOT NULL | e.g. 0.8 |
| `run_mode` | `VARCHAR(20)` | NOT NULL | 'local' or 'remote' |
| `remote_gpu_profile_id` | `INTEGER` | NULLABLE, FOREIGN KEY → `remote_gpu_profiles(id)` | null if run_mode = 'local' |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | overwritten on every new run launch |

---

### 2.3 `run_history`
The core table — one row per training run, whether local or remote, immediate
or scheduled.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `SERIAL` / `UUID` | PRIMARY KEY | |
| `run_name` | `VARCHAR(150)` | NULLABLE | optional user-given tag/name |
| `model_name` | `VARCHAR(50)` | NOT NULL | |
| `dataset_path` | `TEXT` | NOT NULL | |
| `dataset_version_tag` | `VARCHAR(100)` | NULLABLE | for traceability if dataset versioning/tagging is used |
| `use_bg_injection` | `BOOLEAN` | NOT NULL, DEFAULT false | |
| `epochs` | `INTEGER` | NOT NULL | |
| `batch_size` | `INTEGER` | NOT NULL | |
| `learning_rate` | `REAL` | NOT NULL | |
| `image_size` | `INTEGER` | NOT NULL | |
| `train_val_split` | `REAL` | NOT NULL | |
| `run_mode` | `VARCHAR(20)` | NOT NULL | 'local' or 'remote' |
| `remote_gpu_profile_id` | `INTEGER` | NULLABLE, FOREIGN KEY → `remote_gpu_profiles(id)` | null if run_mode = 'local' |
| `schedule_type` | `VARCHAR(20)` | NOT NULL, DEFAULT 'immediate' | 'immediate', 'recurring', or 'one_time_future' |
| `schedule_expression` | `VARCHAR(100)` | NULLABLE | cron expression, if recurring |
| `scheduled_for` | `TIMESTAMPTZ` | NULLABLE | if one_time_future |
| `airflow_dag_id` | `VARCHAR(150)` | NOT NULL | |
| `airflow_dag_run_id` | `VARCHAR(150)` | NULLABLE | populated once triggered |
| `mlflow_run_id` | `VARCHAR(100)` | NULLABLE | populated once training starts logging |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'pending' | 'pending', 'running', 'success', 'failed', 'cancelled' |
| `error_message` | `TEXT` | NULLABLE | populated on failure, for quick in-app display |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT now() | updated on every status check |

**Indexes:**
- `idx_run_history_status` on `status` (for filtering the history view)
- `idx_run_history_created_at` on `created_at` (for sorting, most-recent-first)
- `idx_run_history_model_name` on `model_name` (for filtering by model)

---

## 3. Relationships

```
remote_gpu_profiles (1) ──< (many) run_history
remote_gpu_profiles (1) ──< (0 or 1) last_used_config
```

- A `remote_gpu_profiles` row can be referenced by many `run_history` rows and
  at most one `last_used_config` row.
- `run_history.airflow_dag_run_id` and `run_history.mlflow_run_id` are
  references only (no foreign key, since those IDs live in separate databases
  owned by Airflow/MLflow) — used purely to construct deep-link URLs and to
  query those systems' APIs for on-demand status.

---

## 4. Notes on Design Choices

- `last_used_config` is intentionally a separate table from `run_history`
  rather than "just read the most recent run" — this keeps the pre-fill logic
  simple and decoupled from history filtering/deletion (REQ3A.5 allows deleting
  history entries, which shouldn't affect what pre-fills the form).
- `error_message` is duplicated at the app level (rather than always requiring
  a jump to Airflow logs) so the run history table can show a quick reason for
  failure at a glance.
- No foreign keys into MLflow/Airflow's own databases — those systems are
  external and versioned independently; only their run/DAG IDs are stored as
  plain reference strings.
- SSH keys are referenced by file path only; no private key material or
  passwords are stored in the database.
