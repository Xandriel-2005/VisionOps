import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Zap, Activity, ArrowRight, Loader2, Upload } from 'lucide-react';
import api from '../api/client';
import type { ModelInfo } from '../types';

export function ModelsPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await api.get<ModelInfo[]>('/api/models');
        setModels(response.data);
      } catch (err) {
        console.error('Failed to load models:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchModels();
  }, []);

  const handleNext = () => {
    if (selectedModel) {
      // Save selected model temporarily (e.g. in sessionStorage) so Config page can pre-fill it later
      sessionStorage.setItem('visionops_draft_model', selectedModel);
      navigate('/dataset');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    if (!file.name.endsWith('.pt')) {
      alert('Only .pt weights are supported for Ultralytics models.');
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/api/models/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Add custom model to the list so user can select it
      const customModel: ModelInfo = {
        name: res.data.filename.replace('.pt', ''),
        display_name: `Custom: ${res.data.filename}`,
        description: 'Uploaded custom weights file.',
        parameters: 'Unknown',
        speed: 'Unknown',
        accuracy: 'Unknown'
      };
      setModels([...models, customModel]);
      setSelectedModel(customModel.name);
    } catch (err) {
      console.error('Failed to upload weights', err);
      alert('Failed to upload custom weights.');
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Select Base Model</h1>
        <p className="body-md text-muted">Choose a pretrained model architecture to fine-tune on your dataset.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="grid-2 mb-md">
          {models.map((model) => (
            <div
              key={model.name}
              className={`card card-interactive ${selectedModel === model.name ? 'card-selected' : ''}`}
              onClick={() => setSelectedModel(model.name)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="headline-sm flex items-center gap-xs">
                    <Cpu size={18} className="text-primary" />
                    {model.display_name}
                  </h3>
                  <p className="body-sm text-muted mt-xs">{model.description}</p>
                </div>
                <span className="mono-label label-caps" style={{ backgroundColor: 'var(--surface-container-high)', padding: '2px 6px', borderRadius: '4px' }}>
                  {model.parameters}
                </span>
              </div>
              
              <div className="flex gap-md mt-lg pt-md" style={{ borderTop: '1px solid var(--outline-variant)' }}>
                <div className="flex flex-col gap-xs">
                  <span className="label-caps text-muted flex items-center gap-xs">
                    <Zap size={14} /> Speed
                  </span>
                  <span className="body-sm">{model.speed}</span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="label-caps text-muted flex items-center gap-xs">
                    <Activity size={14} /> Accuracy
                  </span>
                  <span className="body-sm">{model.accuracy}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card mb-md bg-surface-container-highest">
        <h3 className="headline-sm mb-sm flex items-center gap-xs">
          <Upload size={18} className="text-primary" /> Upload Custom Weights
        </h3>
        <p className="body-sm text-muted mb-md">
          Already have a fine-tuned `.pt` model? Upload it here to use it as the base architecture for further training or inference.
        </p>
        <div className="flex items-center gap-md">
          <label className="btn btn-secondary cursor-pointer">
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            <span className="ml-xs">{uploading ? 'Uploading...' : 'Select .pt File'}</span>
            <input type="file" className="hidden" accept=".pt" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-md" style={{ borderTop: '1px solid var(--outline-variant)' }}>
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
