import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings2, ArrowRight, ArrowLeft, Loader2, Clock, Calendar } from 'lucide-react';
import api from '../api/client';
import type { TrainingConfig, GPUProfile } from '../types';

export function ConfigPage() {
  const [config, setConfig] = useState<TrainingConfig | null>(null);
  const [gpuProfiles, setGpuProfiles] = useState<GPUProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        const [configRes, gpuRes] = await Promise.all([
          api.get<TrainingConfig>('/api/config/last-used'),
          api.get<GPUProfile[]>('/api/gpu-profiles')
        ]);
        
        let loadedConfig = configRes.data;
        
        // Overlay values from previous steps (Models and Dataset)
        const draftModel = sessionStorage.getItem('visionops_draft_model');
        const draftDataset = sessionStorage.getItem('visionops_draft_dataset');
        
        if (draftModel) loadedConfig.model_name = draftModel;
        if (draftDataset) loadedConfig.dataset_path = draftDataset;
        
        setConfig(loadedConfig);
        setGpuProfiles(gpuRes.data);
      } catch (err) {
        console.error('Failed to load config/profiles', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleChange = (field: keyof TrainingConfig, value: any) => {
    if (config) {
      setConfig({ ...config, [field]: value });
    }
  };

  const handleNext = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.put('/api/config/last-used', config);
      navigate('/launch');
    } catch (err) {
      console.error('Failed to save config', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Training Configuration</h1>
        <p className="body-md text-muted">Set hyperparameters and environment for the training run.</p>
      </div>

      <div className="grid-2 mb-md">
        {/* Hyperparameters Card */}
        <div className="card">
          <h3 className="headline-sm mb-md flex items-center gap-xs">
            <Settings2 size={18} className="text-primary" /> Hyperparameters
          </h3>
          
          <div className="flex flex-col gap-md">
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Epochs</label>
                <input 
                  type="number" 
                  className="form-input form-input-mono" 
                  value={config.epochs} 
                  onChange={e => handleChange('epochs', parseInt(e.target.value))} 
                  min={1}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Batch Size</label>
                <input 
                  type="number" 
                  className="form-input form-input-mono" 
                  value={config.batch_size} 
                  onChange={e => handleChange('batch_size', parseInt(e.target.value))}
                  min={1}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Learning Rate</label>
                <input 
                  type="number" 
                  className="form-input form-input-mono" 
                  value={config.learning_rate} 
                  onChange={e => handleChange('learning_rate', parseFloat(e.target.value))}
                  step="0.001"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Image Size</label>
                <input 
                  type="number" 
                  className="form-input form-input-mono" 
                  value={config.image_size} 
                  onChange={e => handleChange('image_size', parseInt(e.target.value))}
                  step="32"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Data & Environment Card */}
        <div className="card flex flex-col gap-md">
          <div className="form-group">
            <label className="form-label">Train / Validation Split</label>
            <div className="flex items-center gap-sm">
              <input 
                type="range" 
                className="flex-1" 
                min="0.1" max="0.9" step="0.05"
                value={config.train_val_split}
                onChange={e => handleChange('train_val_split', parseFloat(e.target.value))}
              />
              <span className="mono-data">{Math.round(config.train_val_split * 100)}% Train</span>
            </div>
          </div>

          <div className="form-group mt-sm">
            <label className="flex items-center gap-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={config.use_bg_injection}
                onChange={e => handleChange('use_bg_injection', e.target.checked)}
              />
              <span className="body-md">Inject Background Images (Negative Samples)</span>
            </label>
            <p className="form-hint ml-lg mt-xs">Helps reduce false positives by showing the model empty backgrounds.</p>
            
            {config.use_bg_injection && (
              <div className="mt-sm ml-lg p-md rounded-md" style={{ backgroundColor: 'var(--surface-container-highest)' }}>
                <label className="form-label">Background Images Folder</label>
                <input 
                  type="text" 
                  className="form-input form-input-mono" 
                  placeholder="C:\background_images or /data/backgrounds"
                  value={config.bg_images_path || ''}
                  onChange={e => handleChange('bg_images_path', e.target.value)}
                />
                <p className="form-hint mt-xs">Path to a folder containing background images (no labels needed).</p>
              </div>
            )}
          </div>

          <div className="form-group mt-md pt-md" style={{ borderTop: '1px solid var(--outline-variant)' }}>
            <label className="form-label">Run Mode</label>
            <select 
              className="form-input" 
              value={config.run_mode}
              onChange={e => handleChange('run_mode', e.target.value as 'local' | 'remote')}
            >
              <option value="local">Local Machine</option>
              <option value="remote">Remote GPU (SSH)</option>
            </select>
          </div>

          {config.run_mode === 'remote' && (
            <div className="form-group">
              <label className="form-label">Target GPU Profile</label>
              <select 
                className="form-input" 
                value={config.remote_gpu_profile_id || ''}
                onChange={e => handleChange('remote_gpu_profile_id', parseInt(e.target.value) || null)}
              >
                <option value="">Select a profile...</option>
                {gpuProfiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.host})</option>
                ))}
              </select>
              {gpuProfiles.length === 0 && (
                <p className="form-hint text-status-running">No profiles configured. Add one in Settings.</p>
              )}
            </div>
          )}
        </div>

        {/* Run Scheduling Card */}
        <div className="card flex flex-col gap-md" style={{ gridColumn: '1 / -1' }}>
          <h3 className="headline-sm flex items-center gap-xs">
            <Clock size={18} className="text-primary" /> Run Scheduling
          </h3>
          
          <div className="form-group">
            <label className="form-label">Schedule Type</label>
            <select 
              className="form-input" 
              value={config.schedule_type}
              onChange={e => handleChange('schedule_type', e.target.value)}
            >
              <option value="immediate">Immediate (Run now)</option>
              <option value="one_time_future">One-Time Future</option>
              <option value="recurring">Recurring (Cron)</option>
            </select>
          </div>

          {config.schedule_type === 'recurring' && (
            <div className="form-group p-md rounded-md" style={{ backgroundColor: 'var(--surface-container-highest)' }}>
              <label className="form-label flex items-center gap-xs"><Calendar size={14} /> Cron Expression</label>
              <input 
                type="text" 
                className="form-input form-input-mono" 
                placeholder="0 0 * * *"
                value={config.schedule_expression || ''}
                onChange={e => handleChange('schedule_expression', e.target.value)}
              />
              <p className="form-hint mt-xs">Use standard cron syntax (e.g. "0 0 * * *" for daily at midnight). Airflow will automatically generate a dynamic DAG for this schedule.</p>
            </div>
          )}

          {config.schedule_type === 'one_time_future' && (
            <div className="form-group p-md rounded-md" style={{ backgroundColor: 'var(--surface-container-highest)' }}>
              <label className="form-label flex items-center gap-xs"><Clock size={14} /> Scheduled Date & Time</label>
              <input 
                type="datetime-local" 
                className="form-input" 
                value={config.scheduled_for ? new Date(config.scheduled_for).toISOString().slice(0, 16) : ''}
                onChange={e => handleChange('scheduled_for', new Date(e.target.value).toISOString())}
              />
              <p className="form-hint mt-xs">Select when the run should execute. Airflow will generate a single-run DAG for this time.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between pt-md" style={{ borderTop: '1px solid var(--outline-variant)' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/dataset')} disabled={saving}>
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          className="btn btn-primary" 
          disabled={saving || (config.run_mode === 'remote' && !config.remote_gpu_profile_id)} 
          onClick={handleNext}
        >
          {saving ? 'Saving...' : 'Save & Continue'} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
