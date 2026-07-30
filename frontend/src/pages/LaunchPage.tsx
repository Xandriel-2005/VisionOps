import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowLeft, Loader2, CheckCircle2, Server } from 'lucide-react';
import api from '../api/client';
import type { TrainingConfig } from '../types';

export function LaunchPage() {
  const [config, setConfig] = useState<TrainingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoteWarning, setShowRemoteWarning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await api.get<TrainingConfig>('/api/config/last-used');
        
        // Pick up draft overrides from session
        const draftConfig = { ...res.data };
        const draftModel = sessionStorage.getItem('visionops_draft_model');
        const draftDataset = sessionStorage.getItem('visionops_draft_dataset');
        
        if (draftModel) draftConfig.model_name = draftModel;
        if (draftDataset) draftConfig.dataset_path = draftDataset;
        
        setConfig(draftConfig);
      } catch (err) {
        console.error('Failed to load config', err);
        setError('Failed to load configuration. Please go back and save your settings.');
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleLaunch = () => {
    if (!config) return;
    if (config.run_mode === 'remote') {
      setShowRemoteWarning(true);
    } else {
      executeLaunch();
    }
  };

  const executeLaunch = async () => {
    if (!config) return;
    setLaunching(true);
    setError(null);
    setShowRemoteWarning(false);
    try {
      // Create run (this triggers Airflow on backend)
      const res = await api.post('/api/runs', {
        model_name: config.model_name,
        dataset_path: config.dataset_path,
        use_bg_injection: config.use_bg_injection,
        bg_images_path: config.bg_images_path,
        epochs: config.epochs,
        batch_size: config.batch_size,
        learning_rate: config.learning_rate,
        image_size: config.image_size,
        train_val_split: config.train_val_split,
        run_mode: config.run_mode,
        remote_gpu_profile_id: config.remote_gpu_profile_id,
        schedule_type: config.schedule_type,
        schedule_expression: config.schedule_expression,
        scheduled_for: config.scheduled_for
      });
      
      // Clear session drafts
      sessionStorage.removeItem('visionops_draft_model');
      sessionStorage.removeItem('visionops_draft_dataset');
      
      // Navigate to tracking page for this run
      navigate(`/tracking?run_id=${res.data.id}`);
    } catch (err: any) {
      console.error('Failed to launch run', err);
      setError(err.response?.data?.detail || 'Failed to launch training run.');
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Review & Launch</h1>
        <p className="body-md text-muted">Review your configuration before kicking off the training pipeline.</p>
      </div>

      {error && (
        <div className="mb-md p-md rounded-md bg-status-failed/10 border-status-failed text-error" style={{ border: '1px solid var(--error)', backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)' }}>
          {error}
        </div>
      )}

      {config && (
        <div className="grid-2 mb-lg">
          <div className="card">
            <h3 className="headline-sm mb-md flex items-center gap-xs">
              <CheckCircle2 size={18} className="text-status-success" /> Pipeline Summary
            </h3>
            
            <div className="flex flex-col gap-sm">
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                <span className="text-muted">Base Model</span>
                <span className="mono-data">{config.model_name}</span>
              </div>
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                <span className="text-muted">Dataset</span>
                <span className="mono-data">{config.dataset_path}</span>
              </div>
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                <span className="text-muted">Epochs</span>
                <span className="mono-data">{config.epochs}</span>
              </div>
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                <span className="text-muted">Batch Size</span>
                <span className="mono-data">{config.batch_size}</span>
              </div>
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                <span className="text-muted">Image Size</span>
                <span className="mono-data">{config.image_size}px</span>
              </div>
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                <span className="text-muted">Schedule</span>
                <span className="label-caps">
                  {config.schedule_type === 'immediate' && 'Immediate'}
                  {config.schedule_type === 'recurring' && `Cron: ${config.schedule_expression}`}
                  {config.schedule_type === 'one_time_future' && `Scheduled: ${new Date(config.scheduled_for || '').toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="headline-sm mb-md flex items-center gap-xs">
              <Server size={18} className="text-primary" /> Execution Environment
            </h3>
            
            <div className="flex flex-col gap-sm">
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                <span className="text-muted">Run Mode</span>
                <span className="label-caps">{config.run_mode.toUpperCase()}</span>
              </div>
              
              {config.run_mode === 'remote' && (
                <div className="flex justify-between" style={{ borderBottom: '1px solid var(--outline-variant)', paddingBottom: '8px' }}>
                  <span className="text-muted">GPU Profile ID</span>
                  <span className="mono-data">{config.remote_gpu_profile_id || 'Not selected'}</span>
                </div>
              )}
              
              <div className="mt-md p-md rounded-md" style={{ backgroundColor: 'var(--surface-container-highest)' }}>
                <p className="body-sm text-muted">
                  Clicking Launch will trigger the <span className="mono-data">visionops_training</span> DAG in Airflow, which will orchestrate preprocessing and execute the training script. Live metrics will be streamed via MLflow.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-md" style={{ borderTop: '1px solid var(--outline-variant)' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/config')} disabled={launching}>
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          className="btn btn-primary" 
          onClick={handleLaunch}
          disabled={launching || !config}
          style={{ paddingLeft: 'var(--space-xl)', paddingRight: 'var(--space-xl)' }}
        >
          {launching ? (
            <span className="flex items-center gap-xs"><Loader2 className="animate-spin" size={16} /> Launching...</span>
          ) : (
            <span className="flex items-center gap-xs"><Play size={16} /> Launch Training</span>
          )}
        </button>
      </div>

      {showRemoteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface p-xl rounded-lg max-w-lg w-full border border-outline-variant shadow-xl" style={{ margin: 'var(--space-md)' }}>
            <h2 className="title-lg mb-md flex items-center gap-sm">
              <Server className="text-primary" /> Remote GPU Setup Required
            </h2>
            <div className="body-md text-muted space-y-md">
              <p>
                You are about to launch training on a remote GPU server. 
                Before proceeding, ensure the server meets these requirements:
              </p>
              <ul className="list-disc pl-lg space-y-sm">
                <li><strong className="text-on-surface">SSH Access:</strong> The server must accept connections using your provided SSH key (passwordless login).</li>
                <li><strong className="text-on-surface">Python Environment:</strong> Python 3 and pip must be installed.</li>
                <li><strong className="text-on-surface">Dependencies:</strong> You must have Ultralytics (YOLO) and MLflow pre-installed in the default environment.</li>
                <li><strong className="text-on-surface">Hardware:</strong> A properly configured GPU (e.g., CUDA drivers) must be available.</li>
              </ul>
              <p className="mt-md form-hint">
                VisionOps Airflow will automatically create a temporary workspace workspace, copy the dataset and scripts via SSH, execute the training, and pull the trained weights back.
              </p>
            </div>
            
            <div className="flex justify-end gap-md mt-xl pt-md border-t border-outline-variant">
              <button 
                className="btn btn-ghost"
                onClick={() => setShowRemoteWarning(false)}
                disabled={launching}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={executeLaunch}
                disabled={launching}
              >
                {launching ? 'Launching...' : 'Confirm & Launch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
