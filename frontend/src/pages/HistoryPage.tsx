import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, Activity, Settings, RefreshCw, FolderTree, Database } from 'lucide-react';
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
    <div className="pb-xl">
      <div className="page-header flex justify-between items-start glass-panel p-lg rounded-xl mb-xl">
        <div>
          <h1 className="text-gradient font-bold text-4xl mb-xs">Run History</h1>
          <p className="text-muted flex items-center gap-sm">
            View past training runs, compare metrics, and reload previous configurations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-md">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-muted animate-pulse">Loading history...</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="card glass-panel text-center py-24 flex flex-col items-center justify-center gap-md relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-50" />
          <History size={64} className="text-muted opacity-30 group-hover:scale-110 transition-transform duration-500 group-hover:text-primary" />
          <h3 className="headline-lg text-foreground mt-sm">No runs yet</h3>
          <p className="body-lg text-muted mb-md max-w-md">You haven't launched any training runs yet. Configure your first experiment to get started.</p>
          <button className="btn btn-primary" onClick={() => navigate('/config')}>
            Configure New Run
          </button>
        </div>
      ) : (
        <div className="card glass-panel p-0 overflow-hidden relative border border-border">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-30" />
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-surface-raised/40">
                <tr>
                  <th className="p-md text-sm font-semibold tracking-wider text-muted uppercase">Run ID</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-muted uppercase">Model</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-muted uppercase">Dataset</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-muted uppercase">Status</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-muted uppercase">Date</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-muted text-right uppercase pr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-border hover:bg-surface-raised/30 transition-colors group">
                    <td className="p-md font-mono text-muted text-sm group-hover:text-primary transition-colors">
                      #{run.id.toString().padStart(4, '0')}
                    </td>
                    <td className="p-md">
                      <div className="flex items-center gap-sm">
                        <Database size={16} className="text-accent opacity-70" />
                        <span className="font-medium text-foreground">{run.model_name}</span>
                      </div>
                    </td>
                    <td className="p-md">
                      <div className="flex items-center gap-sm">
                        <FolderTree size={16} className="text-muted" />
                        <span className="font-mono text-sm text-muted">{run.dataset_path.split(/[\/\\]/).pop() || run.dataset_path}</span>
                      </div>
                    </td>
                    <td className="p-md">
                      <StatusChip status={run.status} />
                    </td>
                    <td className="p-md text-sm text-muted">
                      {new Date(run.created_at).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="p-md flex justify-end gap-sm pr-lg">
                      <button 
                        className="btn btn-outline border-border hover:border-primary/50 text-muted hover:text-primary" 
                        onClick={() => handleReloadConfig(run.id)}
                        title="Reload configuration"
                        style={{ padding: '8px' }}
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button 
                        className="btn btn-secondary shadow-sm hover:shadow-accent/20" 
                        onClick={() => navigate(`/tracking?run_id=${run.id}`)}
                        style={{ padding: '8px 16px' }}
                      >
                        <span className="flex items-center gap-xs"><Activity size={16} /> <span className="font-medium">Track</span></span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
