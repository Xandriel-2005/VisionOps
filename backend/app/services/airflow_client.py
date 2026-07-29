import os
import base64
from typing import Dict, Any, Optional
import httpx

class AirflowClient:
    """Client to interact with the Airflow REST API."""
    
    def __init__(self, base_url: str = "http://localhost:8080/api/v1", username: str = "airflow", password: str = "airflow"):
        self.base_url = base_url
        self.username = username
        self.password = password
        
        # Create Basic Auth token
        auth_str = f"{username}:{password}"
        self.auth_token = base64.b64encode(auth_str.encode()).decode()
        
    @property
    def headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Basic {self.auth_token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
    async def trigger_dag(self, dag_id: str, conf: Dict[str, Any]) -> Optional[str]:
        """Triggers an Airflow DAG and returns the DAG Run ID."""
        url = f"{self.base_url}/dags/{dag_id}/dagRuns"
        payload = {"conf": conf}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers, timeout=10.0)
                if response.status_code in (200, 201):
                    return response.json().get("dag_run_id")
                else:
                    print(f"Failed to trigger DAG {dag_id}: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"Error triggering Airflow DAG: {str(e)}")
            return None
                
    async def get_dag_run_status(self, dag_id: str, dag_run_id: str) -> Optional[str]:
        """Gets the status (state) of a specific DAG run."""
        url = f"{self.base_url}/dags/{dag_id}/dagRuns/{dag_run_id}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=5.0)
                if response.status_code == 200:
                    return response.json().get("state")
            except Exception as e:
                print(f"Error fetching DAG status: {str(e)}")
            return None

# Singleton instance for the app to use
airflow = AirflowClient(
    base_url=os.getenv("AIRFLOW_API_URL", "http://localhost:8080/api/v1"),
    username=os.getenv("AIRFLOW_USERNAME", "airflow"),
    password=os.getenv("AIRFLOW_PASSWORD", "airflow")
)
