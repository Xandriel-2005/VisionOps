import requests

url = "http://localhost:8080/api/v1/dags/visionops_training/dagRuns"
auth = ("airflow", "airflow")
payload = {
    "conf": {
        "model_name": "yolov8n",
        "dataset_path": "/opt/airflow/datasets/animals.v2i.yolov8/data.yaml",
        "epochs": 2,
        "batch_size": 16,
        "learning_rate": 0.01,
        "image_size": 640,
        "run_mode": "local",
        "use_bg_injection": False
    }
}
try:
    r = requests.post(url, json=payload, auth=auth)
    print("Status:", r.status_code)
    print("Response:", r.text)
except Exception as e:
    print("Error:", e)
