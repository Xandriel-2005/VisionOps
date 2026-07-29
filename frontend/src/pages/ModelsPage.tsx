import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Search, Filter, ArrowDown, MoreHorizontal, Loader2, Upload, Plus, ArrowRight } from 'lucide-react';
import api from '../api/client';
import type { ModelInfo } from '../types';

export function ModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const fetchModels = async () => {
    try {
      const response = await api.get<ModelInfo[]>('/api/models');
      setModels(response.data);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleNext = () => {
    if (selectedModel) {
      sessionStorage.setItem('visionops_draft_model', selectedModel);
      navigate('/dataset');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const validExts = ['.pt', '.onnx', '.tflite'];
    if (!validExts.some(ext => file.name.endsWith(ext))) {
      alert('Only .pt, .onnx, and .tflite weights are supported.');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      await api.post('/api/models/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchModels();
    } catch (err) {
      console.error('Failed to upload weights', err);
      alert('Failed to upload custom weights.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const getStatusClass = (status?: string) => {
    if (!status) return 'pending';
    switch (status.toUpperCase()) {
      case 'DEPLOYED': return 'success';
      case 'READY': return 'success';
      case 'TRAINING': return 'running';
      case 'FAILED': return 'failed';
      default: return 'pending';
    }
  };

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div>
          <h1>Models</h1>
          <p className="body-md text-muted mt-sm">Manage and deploy vision architectures across clusters.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> Register New Model
        </button>
      </div>

      <div className="card mb-lg" style={{ padding: 'var(--space-sm)' }}>
        <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-xs flex-1" style={{ minWidth: '200px', borderRight: '1px solid var(--outline)', paddingRight: 'var(--space-sm)' }}>
            <Search size={16} className="text-muted" />
            <input type="text" placeholder="Search by model name or architecture..." className="form-input" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }} />
          </div>
          <div className="flex items-center gap-xs text-muted" style={{ paddingRight: 'var(--space-sm)' }}>
            <Filter size={16} />
            <span className="body-sm">All Architectures</span>
          </div>
          <div className="flex items-center gap-xs text-muted">
            <ArrowDown size={16} />
            <span className="body-sm">Latest Update</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center" style={{ padding: '40px 0' }}>
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
          {models.length === 0 ? (
            <div className="card flex flex-col items-center justify-center" style={{ padding: '40px 0', borderStyle: 'dashed', gridColumn: '1 / -1' }}>
              <Cpu size={32} className="text-muted mb-md" />
              <h3 className="headline-sm text-primary">No models found</h3>
              <p className="body-md text-muted mt-xs">Your weights folder is currently empty.</p>
            </div>
          ) : (
            models.map((model) => (
              <div
                key={model.name}
                className={`card card-interactive ${selectedModel === model.name ? 'card-selected' : ''}`}
                onClick={() => setSelectedModel(model.name)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-md items-start">
                    <div style={{ padding: '10px', backgroundColor: 'var(--primary-container)', border: '1px solid var(--primary)' }}>
                      <Cpu size={24} className="text-primary" />
                    </div>
                    <div>
                      <h3 className="headline-sm">{model.display_name}</h3>
                      <div className="mono-label mt-xs" style={{ backgroundColor: 'var(--surface-container-high)', padding: '4px 8px', border: '1px solid var(--outline)', display: 'inline-block' }}>
                        {model.architecture || 'Unknown'}
                      </div>
                      <p className="body-sm text-muted mt-sm">{model.description}</p>
                    </div>
                  </div>

                  <div className={`status-chip ${getStatusClass(model.status)}`}>
                    <div className="status-dot"></div>
                    {model.status?.toUpperCase() || 'UNKNOWN'}
                  </div>
                </div>
                
                {model.training_progress ? (
                  <div className="mt-md pt-md" style={{ borderTop: '1px solid var(--outline)' }}>
                    <div className="flex justify-between mb-xs">
                      <span className="label-caps text-muted">Epoch {model.training_progress.epoch}/{model.training_progress.total}</span>
                      <span className="mono-data text-primary">{model.training_progress.percent}%</span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: 'var(--surface-container-high)', overflow: 'hidden', marginBottom: 'var(--space-xs)', border: '1px solid var(--outline)' }}>
                      <div style={{ height: '100%', width: `${model.training_progress.percent}%`, backgroundColor: 'var(--primary)' }}></div>
                    </div>
                    <div className="body-sm text-muted">Current Loss: {model.training_progress.loss}</div>
                  </div>
                ) : (
                  <div className="grid-3 mt-md pt-md" style={{ borderTop: '1px solid var(--outline)' }}>
                    {model.metrics && Object.entries(model.metrics).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-xs">
                        <span className="label-caps text-muted">{key}</span>
                        <span className="mono-data">{value}</span>
                      </div>
                    ))}
                    {!model.metrics && (
                      <div className="body-sm text-muted">No metrics available.</div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-md pt-md text-muted" style={{ borderTop: '1px solid var(--outline)' }}>
                  <span className="mono-data text-muted">{model.updated_at || 'Never updated'}</span>
                  <button className="btn-icon btn-ghost" style={{ margin: '-8px' }}>
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Import Local Model Dropzone */}
      <div className="card mb-lg card-interactive" style={{ borderStyle: 'dashed', textAlign: 'center', backgroundColor: 'var(--surface-container-lowest)' }}>
        <label className="cursor-pointer flex flex-col items-center w-full">
          <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--surface-container)', border: '1px solid var(--outline)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
            {uploading ? <Loader2 className="animate-spin text-primary" size={24} /> : <Upload className="text-primary" size={24} />}
          </div>
          <h3 className="headline-sm mb-xs">Import Local Model</h3>
          <p className="body-sm text-muted mb-md">Upload weight files (.pt, .onnx, .tflite)</p>
          <div className="btn btn-secondary" style={{ pointerEvents: 'none' }}>
            {uploading ? 'Uploading...' : 'Browse Files'}
          </div>
          <input type="file" className="hidden" accept=".pt,.onnx,.tflite" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="flex justify-end pt-md">
        <button 
          className="btn btn-primary" 
          disabled={!selectedModel} 
          onClick={handleNext}
        >
          Next Step: Dataset <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
