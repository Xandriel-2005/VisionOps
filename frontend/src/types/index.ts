export type RunStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
export type RunMode = 'local' | 'remote';
export type ScheduleType = 'immediate' | 'recurring' | 'one_time_future';

export interface GPUProfile {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  ssh_key_path: string;
  venv_path: string | null;
  created_at: string;
  last_used_at: string | null;
}

export interface TrainingConfig {
  model_name: string;
  dataset_path: string;
  use_bg_injection: boolean;
  bg_images_path: string;
  epochs: number;
  batch_size: number;
  learning_rate: number;
  image_size: number;
  train_val_split: number;
  run_mode: RunMode;
  remote_gpu_profile_id: number | null;
  schedule_type: ScheduleType;
  schedule_expression: string | null;
  scheduled_for: string | null;
  updated_at?: string | null;
}

export interface RunRecord {
  id: number;
  run_name: string | null;
  model_name: string;
  dataset_path: string;
  dataset_version_tag: string | null;
  use_bg_injection: boolean;
  bg_images_path: string;
  epochs: number;
  batch_size: number;
  learning_rate: number;
  image_size: number;
  train_val_split: number;
  run_mode: RunMode;
  remote_gpu_profile_id: number | null;
  schedule_type: ScheduleType;
  schedule_expression: string | null;
  scheduled_for: string | null;
  airflow_dag_id: string;
  airflow_dag_run_id: string | null;
  mlflow_run_id: string | null;
  status: RunStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  name: string;
  display_name: string;
  description: string;
  architecture: string;
  status: string;
  updated_at: string;
  metrics?: Record<string, string | number>;
  training_progress?: {
    epoch: number;
    total: number;
    loss: number;
    percent: number;
  };
}

export interface DatasetSummary {
  total_images: number;
  total_labels: number;
  classes: Record<string, number>;
  sample_images: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: DatasetSummary | null;
}

export interface InferenceResult {
  detections: Detection[];
  inference_time_ms: number;
  image_path: string;
}

export interface Detection {
  class_name: string;
  confidence: number;
  bbox: [number, number, number, number]; // x1, y1, x2, y2
}
