import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Target, Crosshair } from 'lucide-react';
import api from '../api/client';

export function InferencePage() {
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [weightsPath, setWeightsPath] = useState('');
  const [confThreshold, setConfThreshold] = useState(0.25);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load available models for dropdown
    async function fetchModels() {
      try {
        const res = await api.get('/api/models');
        setModels(res.data);
        if (res.data.length > 0) {
          setSelectedModel(res.data[0].name);
        }
      } catch (err) {
        console.error('Failed to load models for inference', err);
      }
    }
    fetchModels();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null); // Clear previous result
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleRunInference = async () => {
    if (!selectedFile || !selectedModel) return;
    
    setLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('model_name', selectedModel);
    if (weightsPath) {
      formData.append('weights_path', weightsPath);
    }
    formData.append('conf_threshold', confThreshold.toString());

    try {
      const res = await api.post('/api/inference', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(res.data.detections);
    } catch (err: any) {
      console.error('Inference failed', err);
      setError(err.response?.data?.detail || 'Inference failed. Check server logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Inference Testing</h1>
        <p className="body-md text-muted">Upload an image and run predictions using your trained models.</p>
      </div>

      <div className="grid-2">
        <div className="card h-fit">
          <h3 className="headline-sm mb-md flex items-center gap-xs"><Target size={18} className="text-primary" /> Configuration</h3>
          
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="label-caps">Model Architecture</label>
              <select className="input" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                {models.map(m => (
                  <option key={m.name} value={m.name}>{m.display_name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="label-caps flex justify-between">
                <span>Custom Weights Path</span>
                <span className="text-muted font-normal">(Optional)</span>
              </label>
              <input 
                type="text" 
                className="input" 
                placeholder="/runs/detect/train/weights/best.pt" 
                value={weightsPath}
                onChange={e => setWeightsPath(e.target.value)}
              />
              <span className="body-sm text-muted mt-xs">Leave blank to use base pretrained weights.</span>
            </div>
            
            <div className="form-group">
              <label className="label-caps flex justify-between">
                <span>Confidence Threshold: {confThreshold}</span>
              </label>
              <input 
                type="range" 
                min="0.01" 
                max="1.0" 
                step="0.01" 
                value={confThreshold}
                onChange={e => setConfThreshold(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-md">
          {error && (
            <div className="p-md rounded-md bg-status-failed/10 border-status-failed text-error" style={{ border: '1px solid var(--error)', backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)' }}>
              {error}
            </div>
          )}
          
          <div 
            className="card border-dashed flex flex-col items-center justify-center p-xl cursor-pointer transition-colors hover:bg-surface-container-highest"
            style={{ 
              border: '2px dashed var(--outline-variant)', 
              minHeight: '400px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => !previewUrl && fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileSelect}
            />
            
            {previewUrl ? (
              <div className="relative w-full h-full flex flex-col items-center">
                {/* 
                  Note: In a fully fleshed out React implementation, we would draw the 
                  bounding boxes on a canvas overlaid on the image using the result state.
                  For scaffold, we display the image and dump the JSON below it.
                */}
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  style={{ maxHeight: '350px', objectFit: 'contain', borderRadius: '4px' }} 
                />
                
                <div className="absolute top-sm right-sm flex gap-sm">
                  <button 
                    className="btn btn-secondary shadow-lg" 
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); setResult(null); }}
                    style={{ backgroundColor: 'var(--surface-container-highest)' }}
                  >
                    Clear
                  </button>
                  <button 
                    className="btn btn-primary shadow-lg"
                    onClick={(e) => { e.stopPropagation(); handleRunInference(); }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Crosshair size={16} />}
                    <span className="ml-xs">{loading ? 'Processing...' : 'Run Inference'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted flex flex-col items-center pointer-events-none">
                <Upload size={48} className="mb-md opacity-50" />
                <h3 className="headline-sm mb-xs">Upload an Image</h3>
                <p className="body-md">Drag and drop or click to browse</p>
              </div>
            )}
          </div>
          
          {result && (
            <div className="card">
              <h3 className="headline-sm mb-md">Detection Results</h3>
              <div className="bg-surface-highest p-sm rounded-md mono-sm" style={{ backgroundColor: '#1e1e1e', color: '#d4d4d4', overflowX: 'auto' }}>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
              <p className="body-sm text-muted mt-sm">Note: Box rendering over the image will be implemented in UI Polish.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
