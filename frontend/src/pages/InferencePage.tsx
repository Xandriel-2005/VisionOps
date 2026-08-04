import { useState, useRef, useEffect } from 'react';
import { Upload, Loader2, Target, Cpu, FolderUp, Download } from 'lucide-react';
import api from '../api/client';

export function InferencePage() {
  const [models, setModels] = useState<any[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [confThreshold, setConfThreshold] = useState(0.25);
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
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
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setSuccessMsg(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFiles(Array.from(e.dataTransfer.files));
      setSuccessMsg(null);
    }
  };

  const handleRunInference = async () => {
    if (selectedFiles.length === 0 || !selectedModel) return;
    
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('model_name', selectedModel);
    formData.append('conf_threshold', confThreshold.toString());
    
    // Pass the full path from the model object (API returns absolute paths)
    const selectedModelObj = models.find(m => m.name === selectedModel);
    if (selectedModelObj?.path) {
      formData.append('weights_path', selectedModelObj.path);
    }

    try {
      const res = await api.post('/api/inference/batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob' // Crucial for receiving binary zip file
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'inference_results.zip');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      setSuccessMsg('Batch inference complete! Results downloaded.');
    } catch (err: any) {
      console.error('Inference failed', err);
      setError('Inference failed. Check server logs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Batch Inference</h1>
        <p className="body-md text-on-surface-variant">Select a trained model, upload a folder of images, and download the annotated results.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card h-fit flex flex-col gap-6">
          <div>
            <h3 className="headline-sm mb-4 flex items-center gap-1"><Target size={18} className="text-primary" /> Model Selection</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
              {models.length === 0 ? (
                 <div className="col-span-full p-4 border border-dashed rounded-md text-center text-on-surface-variant">No models found. Train or upload a model first.</div>
              ) : (
                models.map(m => (
                  <div 
                    key={m.name} 
                    className={`card card-interactive p-3 flex flex-col gap-1 ${selectedModel === m.name ? 'border-primary bg-primary/5' : ''}`}
                    onClick={() => setSelectedModel(m.name)}
                    style={{ borderWidth: selectedModel === m.name ? '2px' : '1px' }}
                  >
                    <div className="flex items-center gap-2">
                       <Cpu size={16} className={selectedModel === m.name ? 'text-primary' : 'text-on-surface-variant'} />
                       <span className="font-bold truncate">{m.display_name}</span>
                    </div>
                    <span className="body-sm text-on-surface-variant truncate">{m.description}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div>
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
        
        <div className="flex flex-col gap-4">
          {error && (
            <div className="p-md rounded-md bg-status-failed/10 border-status-failed text-status-failed" style={{ border: '1px solid var(--error)', backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)' }}>
              {error}
            </div>
          )}
          
          {successMsg && (
            <div className="p-md rounded-md bg-status-success/10 border-status-success text-status-success" style={{ border: '1px solid var(--status-success)', backgroundColor: 'color-mix(in srgb, var(--status-success) 10%, transparent)' }}>
              {successMsg}
            </div>
          )}
          
          <div 
            className="card border-dashed flex flex-col items-center justify-center p-xl transition-colors hover:bg-surface-container-highest"
            style={{ 
              border: '2px dashed var(--outline-variant)', 
              minHeight: '300px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              multiple
              onChange={handleFileSelect}
            />
            {/* The webkitdirectory attribute allows folder selection */}
            <input 
              type="file" 
              ref={folderInputRef} 
              className="hidden" 
              accept="image/*" 
              // @ts-ignore
              webkitdirectory=""
              // @ts-ignore
              directory=""
              multiple
              onChange={handleFileSelect}
            />
            
            {selectedFiles.length > 0 ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center text-center">
                 <FolderUp size={48} className="text-primary mb-4" />
                 <h3 className="headline-md mb-2">{selectedFiles.length} Images Selected</h3>
                 <p className="body-sm text-on-surface-variant mb-6">Ready for batch inference using {selectedModel}</p>
                
                <div className="flex flex-wrap justify-center gap-3">
                  <button 
                    className="btn btn-secondary shadow-sm" 
                    onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); setSuccessMsg(null); }}
                  >
                    Clear Selection
                  </button>
                  <button 
                    className="btn btn-primary shadow-sm"
                    onClick={(e) => { e.stopPropagation(); handleRunInference(); }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                    <span className="ml-xs">{loading ? 'Processing...' : 'Run & Download ZIP'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-on-surface-variant flex flex-col items-center">
                <Upload size={48} className="mb-4 opacity-50" />
                <h3 className="headline-sm mb-1">Upload Images</h3>
                <p className="body-md mb-4">Drag & drop images here, or choose an option below</p>
                
                <div className="flex gap-3">
                  <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
                    Select Files
                  </button>
                  <button className="btn btn-secondary" onClick={() => folderInputRef.current?.click()}>
                    <FolderUp size={16} className="mr-1"/> Select Folder
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
