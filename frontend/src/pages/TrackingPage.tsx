import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Activity, Loader2, RefreshCw, ArrowLeft, Terminal } from 'lucide-react';
import api from '../api/client';
import { StatusChip } from '../components/StatusChip';

import type { RunStatus } from '../types';

interface TrackingData {
  run_id: number;
  model_name: string;
  status: RunStatus;
  metrics: Record<string, number>;
}

export function TrackingPage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('run_id');
  const navigate = useNavigate();
  
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async () => {
    if (!runId) return;
    try {
      const res = await api.get<TrackingData>(`/api/tracking/${runId}/live`);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch tracking data", err);
      setError("Failed to load live tracking data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    // Poll every 5 seconds
    const interval = setInterval(fetchTracking, 5000);
    return () => clearInterval(interval);
  }, [runId]);

  if (!runId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-md">
        <p className="text-muted">No run ID specified.</p>
        <button className="btn btn-primary" onClick={() => navigate('/history')}>Go to Run History</button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex justify-between items-end">
        <div>
          <button className="btn btn-ghost mb-sm p-0 flex items-center gap-xs" style={{ minWidth: 'auto', minHeight: 'auto', color: 'var(--text-muted)' }} onClick={() => navigate('/history')}>
            <ArrowLeft size={14} /> Back to History
          </button>
          <h1>Run Tracking: #{runId}</h1>
          <p className="body-md text-muted">Live metrics streamed from MLflow and status from Airflow.</p>
        </div>
        
        {data && <StatusChip status={data.status} />}
      </div>

      {error && (
        <div className="mb-md p-md rounded-md bg-status-failed/10 border-status-failed text-error" style={{ border: '1px solid var(--error)', backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid-2 mb-lg">
            <div className="card">
              <h3 className="headline-sm mb-md flex items-center gap-xs">
                <Activity size={18} className="text-primary" /> Live Metrics
              </h3>
              
              {Object.keys(data.metrics).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-lg text-muted">
                  <RefreshCw className="animate-spin mb-sm" size={24} />
                  <p>Waiting for MLflow metrics...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-sm">
                  {Object.entries(data.metrics).map(([key, value]) => (
                    <div key={key} className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                      <span className="text-muted">{key}</span>
                      <span className="mono-data">{value.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="headline-sm mb-md flex items-center gap-xs">
                <Terminal size={18} className="text-primary" /> Airflow Logs
              </h3>
              
              <div className="bg-surface-highest p-sm rounded-md mono-sm" style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', height: '200px', overflowY: 'auto' }}>
                <p className="text-muted mb-xs">// Log streaming will be implemented in a future phase.</p>
                <p>Status: {data.status}</p>
                <p>Model: {data.model_name}</p>
                {data.status === 'running' && (
                  <p className="animate-pulse">Waiting for updates...</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
