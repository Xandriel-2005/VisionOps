import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Loader2, Activity, RefreshCw, FolderTree, Database, Save } from 'lucide-react';
import api from '../api/client';
import type { RunRecord } from '../types';
import { StatusChip } from '../components/StatusChip';
import { Modal } from '../components/Modal';

export function HistoryPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Model Registration State
  const [registerModalRunId, setRegisterModalRunId] = useState<number | null>(null);
  const [registryName, setRegistryName] = useState('');
  const [registryDesc, setRegistryDesc] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

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

  const handleRegisterSubmit = async () => {
    if (!registerModalRunId || !registryName.trim()) return;
    setIsRegistering(true);
    try {
      await api.post(`/api/runs/${registerModalRunId}/register`, {
        registry_name: registryName,
        description: registryDesc
      });
      setRegisterModalRunId(null);
      setRegistryName('');
      setRegistryDesc('');
      alert('Model successfully registered!');
    } catch (err: any) {
      console.error('Failed to register model', err);
      alert('Failed to register model: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="pb-xl">
      <div className="page-header flex justify-between items-start glass-panel p-lg rounded-xl mb-xl">
        <div>
          <h1 className="text-gradient font-bold text-4xl mb-1">Run History</h1>
          <p className="text-on-surface-variant flex items-center gap-2">
            View past training runs, compare metrics, and reload previous configurations.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-on-surface-variant animate-pulse">Loading history...</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="card glass-panel text-center py-24 flex flex-col items-center justify-center gap-4 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-50" />
          <History size={64} className="text-on-surface-variant opacity-30 group-hover:scale-110 transition-transform duration-500 group-hover:text-primary" />
          <h3 className="headline-lg text-foreground mt-2">No runs yet</h3>
          <p className="body-lg text-on-surface-variant mb-4 max-w-md">You haven't launched any training runs yet. Configure your first experiment to get started.</p>
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
                  <th className="p-md text-sm font-semibold tracking-wider text-on-surface-variant uppercase">Run ID</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-on-surface-variant uppercase">Model</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-on-surface-variant uppercase">Dataset</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-on-surface-variant uppercase">Status</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-on-surface-variant uppercase">Date</th>
                  <th className="p-md text-sm font-semibold tracking-wider text-on-surface-variant text-right uppercase pr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-t border-border hover:bg-surface-raised/30 transition-colors group">
                    <td className="p-md font-mono text-on-surface-variant text-sm group-hover:text-primary transition-colors">
                      #{run.id.toString().padStart(4, '0')}
                    </td>
                    <td className="p-md">
                      <div className="flex items-center gap-2">
                        <Database size={16} className="text-accent opacity-70" />
                        <span className="font-medium text-foreground">{run.model_name}</span>
                      </div>
                    </td>
                    <td className="p-md">
                      <div className="flex items-center gap-2">
                        <FolderTree size={16} className="text-on-surface-variant" />
                        <span className="font-mono text-sm text-on-surface-variant">{run.dataset_path.split(/[\/\\]/).pop() || run.dataset_path}</span>
                      </div>
                    </td>
                    <td className="p-md">
                      <StatusChip status={run.status} />
                    </td>
                    <td className="p-md text-sm text-on-surface-variant">
                      {new Date(run.created_at).toLocaleString(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="p-md flex justify-end gap-2 pr-lg">
                      <button 
                        className="btn btn-outline border-border hover:border-primary/50 text-on-surface-variant hover:text-primary" 
                        onClick={() => {
                          setRegisterModalRunId(run.id);
                          setRegistryName(run.model_name || '');
                          setRegistryDesc('');
                        }}
                        title="Register Model"
                        style={{ padding: '8px' }}
                      >
                        <Save size={16} />
                      </button>
                      <button 
                        className="btn btn-outline border-border hover:border-primary/50 text-on-surface-variant hover:text-primary" 
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
                        <span className="flex items-center gap-1"><Activity size={16} /> <span className="font-medium">Track</span></span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model Registration Modal */}
      <Modal 
        isOpen={registerModalRunId !== null} 
        onClose={() => setRegisterModalRunId(null)}
        title="Register Model"
      >
        <div className="flex flex-col gap-4">
          <p className="text-on-surface-variant text-sm mb-2">
            Register this run's model into the MLflow Model Registry. This allows you to manage versions, stage models for production, and serve them.
          </p>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-foreground">Registry Name *</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. My-Object-Detector"
              value={registryName}
              onChange={(e) => setRegistryName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-foreground">Description (Optional)</label>
            <textarea 
              className="input-field min-h-[100px]" 
              placeholder="Describe this version of the model..."
              value={registryDesc}
              onChange={(e) => setRegistryDesc(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button className="btn btn-outline" onClick={() => setRegisterModalRunId(null)} disabled={isRegistering}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleRegisterSubmit} 
              disabled={isRegistering || !registryName.trim()}
            >
              {isRegistering ? (
                <span className="flex items-center gap-1"><Loader2 className="animate-spin" size={16} /> Registering...</span>
              ) : 'Register Model'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
