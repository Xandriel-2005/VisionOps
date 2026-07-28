-- ========================
-- VisionOps DB Initialization
-- ========================
-- Creates separate databases for the app, Airflow, and MLflow
-- on the same Postgres instance.

-- Airflow needs its own database
CREATE DATABASE airflow;

-- MLflow needs its own database
CREATE DATABASE mlflow;

-- Grant privileges (the visionops user owns all three)
GRANT ALL PRIVILEGES ON DATABASE airflow TO visionops;
GRANT ALL PRIVILEGES ON DATABASE mlflow TO visionops;
