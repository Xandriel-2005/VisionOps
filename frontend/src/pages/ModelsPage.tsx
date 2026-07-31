import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Search, Filter, Loader2, Upload, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../api/client';
import type { ModelInfo } from '../types';

export function ModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [detector, setDetector] = useState<'ultralytics' | 'huggingface' | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [hfModelId, setHfModelId] = useState<string>('');
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
    const finalModel = detector === 'huggingface' && hfModelId ? hfModelId : selectedModel;
    if (finalModel) {
      sessionStorage.setItem('visionops_draft_model', finalModel);
      sessionStorage.setItem('visionops_draft_detector', detector || '');
      navigate('/dataset');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const validExts = ['.pt', '.onnx', '.tflite', '.safetensors'];
    if (!validExts.some(ext => file.name.endsWith(ext))) {
      alert('Only .pt, .onnx, .tflite, and .safetensors weights are supported.');
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

  if (!detector) {
    return (
      <div>
        <div className="page-header flex justify-between items-center mb-lg">
          <div>
            <h1>Select Detector Architecture</h1>
            <p className="body-md text-muted mt-sm">Choose the underlying machine learning framework for your task.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-md)' }}>
          <div 
            className="card card-interactive" 
            style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
            onClick={() => setDetector('ultralytics')}
          >
            <div style={{ padding: '16px', backgroundColor: 'var(--primary-container)', border: '1px solid var(--primary)', alignSelf: 'flex-start', borderRadius: '8px' }}>
              <Cpu size={32} className="text-primary" />
            </div>
            <h2 className="headline-md">Ultralytics YOLO</h2>
            <p className="body-md text-muted">
              Optimized for fast, real-time object detection models like YOLOv8, YOLOv10, and RT-DETR. Ideal for edge devices and high-speed inference.
            </p>
            <button className="btn btn-primary mt-auto">Select Ultralytics <ArrowRight size={16} /></button>
          </div>

          <div 
            className="card card-interactive" 
            style={{ padding: 'var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
            onClick={() => setDetector('huggingface')}
          >
            <div style={{ padding: '16px', backgroundColor: 'var(--primary-container)', border: '1px solid var(--primary)', alignSelf: 'flex-start', borderRadius: '8px' }}>
              <Cpu size={32} className="text-primary" />
            </div>
            <h2 className="headline-md">Hugging Face Transformers</h2>
            <p className="body-md text-muted">
              Provides access to a vast ecosystem of transformer-based models (e.g., DETR, OwlViT) and community weights. Best for state-of-the-art accuracy and research.
            </p>
            <button className="btn btn-primary mt-auto">Select Hugging Face <ArrowRight size={16} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div className="flex gap-md items-center">
          <button className="btn-icon btn-ghost" onClick={() => { setDetector(null); setSelectedModel(null); setHfModelId(''); }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1>Models ({detector === 'ultralytics' ? 'Ultralytics' : 'Hugging Face'})</h1>
            <p className="body-md text-muted mt-sm">Select or provide weights for the selected architecture.</p>
          </div>
        </div>
        <button className="btn btn-primary">
          <Plus size={16} /> Register New Model
        </button>
      </div>

      {detector === 'huggingface' ? (
        <div className="card mb-lg" style={{ padding: 'var(--space-xl)' }}>
          <h2 className="headline-sm mb-md">Hugging Face Hub Model</h2>
          <p className="body-md text-muted mb-lg">Enter the ID of a Hugging Face model repository (e.g., <code>facebook/detr-resnet-50</code>).</p>
          <input 
            type="text" 
            className="form-input w-full" 
            placeholder="e.g. facebook/detr-resnet-50" 
            value={hfModelId}
            onChange={(e) => setHfModelId(e.target.value)}
          />
        </div>
      ) : (
        <>
          <div className="card mb-lg" style={{ padding: 'var(--space-sm)' }}>
            <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
              <div className="flex items-center gap-xs flex-1" style={{ minWidth: '200px', borderRight: '1px solid var(--outline)', paddingRight: 'var(--space-sm)' }}>
                <Search size={16} className="text-muted" />
                <input type="text" placeholder="Search local weights..." className="form-input" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }} />
              </div>
              <div className="flex items-center gap-xs text-muted" style={{ paddingRight: 'var(--space-sm)' }}>
                <Filter size={16} />
                <span className="body-sm">All Weights</span>
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
                  <h3 className="headline-sm text-primary">No local weights found</h3>
                  <p className="body-md text-muted mt-xs">Your weights folder is currently empty. Upload a weight file below.</p>
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
                            {model.architecture || 'Custom'}
                          </div>
                          <p className="body-sm text-muted mt-sm">{model.description}</p>
                        </div>
                      </div>

                      <div className={`status-chip ${getStatusClass(model.status)}`}>
                        <div className="status-dot"></div>
                        {model.status?.toUpperCase() || 'UNKNOWN'}
                      </div>
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
              <p className="body-sm text-muted mb-md">Upload weight files (.pt, .onnx, .safetensors)</p>
              <div className="btn btn-secondary" style={{ pointerEvents: 'none' }}>
                {uploading ? 'Uploading...' : 'Browse Files'}
              </div>
              <input type="file" className="hidden" accept=".pt,.onnx,.tflite,.safetensors" onChange={handleUpload} disabled={uploading} style={{ display: 'none' }} />
            </label>
          </div>
        </>
      )}

      <div className="flex justify-end pt-md">
        <button 
          className="btn btn-primary" 
          disabled={detector === 'huggingface' ? !hfModelId : !selectedModel} 
          onClick={handleNext}
        >
          Next Step: Dataset <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
