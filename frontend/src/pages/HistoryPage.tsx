import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, Activity, Settings } from 'lucide-react';
import api from '../api/client';
import type { RunRecord } from '../types';
import { StatusChip } from '../components/StatusChip';

export function HistoryPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchRuns() {
      try {
        const response = await api.get<RunRecord[]>('/api/runs');
        setRuns(response.data);
      } catch (err) {
        console.error('Failed to load history', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRuns();
  }, []);

  const handleReloadConfig = async (runId: number) => {
    try {
      await api.post(`/api/runs/${runId}/reload-config`);
      navigate('/config');
    } catch (err) {
      console.error('Failed to reload config', err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Run History</h1>
        <p className="body-md text-muted">View past training runs, compare metrics, and reload previous configurations.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : runs.length === 0 ? (
        <div className="card text-center py-xl">
          <History size={48} className="text-muted mx-auto mb-md opacity-50" />
          <h3 className="headline-sm">No runs yet</h3>
          <p className="body-md text-muted mt-sm mb-lg">You haven't launched any training runs.</p>
          <button className="btn btn-primary" onClick={() => navigate('/models')}>
            Start New Run
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead style={{ backgroundColor: 'var(--surface-container-high)', borderBottom: '1px solid var(--outline-variant)' }}>
              <tr>
                <th className="p-md label-caps text-muted">ID</th>
                <th className="p-md label-caps text-muted">Model</th>
                <th className="p-md label-caps text-muted">Dataset</th>
                <th className="p-md label-caps text-muted">Status</th>
                <th className="p-md label-caps text-muted">Date</th>
                <th className="p-md label-caps text-muted text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} style={{ borderBottom: '1px solid var(--outline-variant)' }} className="hover:bg-surface-container-highest transition-colors">
                  <td className="p-md mono-data text-muted">#{run.id}</td>
                  <td className="p-md font-medium">{run.model_name}</td>
                  <td className="p-md mono-sm text-muted">{run.dataset_path.split('/').pop() || run.dataset_path}</td>
                  <td className="p-md">
                    <StatusChip status={run.status} />
                  </td>
                  <td className="p-md body-sm text-muted">
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                  <td className="p-md flex justify-end gap-sm">
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => handleReloadConfig(run.id)}
                      title="Reload this config"
                      style={{ padding: '8px' }}
                    >
                      <Settings size={16} />
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => navigate(`/tracking?run_id=${run.id}`)}
                      style={{ padding: '8px 12px' }}
                    >
                      <span className="flex items-center gap-xs"><Activity size={14} /> View</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
