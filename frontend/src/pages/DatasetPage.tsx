import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, CheckCircle, XCircle, ArrowRight, ArrowLeft, Search } from 'lucide-react';
import api from '../api/client';
import type { ValidationResult } from '../types';
import { FolderBrowserModal } from '../components/FolderBrowserModal';

export function DatasetPage() {
  const [path, setPath] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const navigate = useNavigate();

  const handleValidate = async (pathToValidate: string = path) => {
    if (!pathToValidate) return;
    setValidating(true);
    setResult(null);
    try {
      const response = await api.post<ValidationResult>('/api/dataset/validate', { path: pathToValidate });
      setResult(response.data);
    } catch (err) {
      console.error('Validation failed:', err);
      setResult({ valid: false, errors: ['Failed to reach validation service'], warnings: [], summary: null });
    } finally {
      setValidating(false);
    }
  };

  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUploadZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const response = await api.post('/api/dataset/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.status === 'success') {
        setPath(response.data.path);
        handleValidate(response.data.path);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setResult({ valid: false, errors: ['Failed to upload ZIP file'], warnings: [], summary: null });
    } finally {
      setUploading(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleNext = () => {
    if (result?.valid) {
      sessionStorage.setItem('visionops_draft_dataset', path);
      navigate('/config');
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Dataset Configuration</h1>
        <p className="body-md text-on-surface-variant">Point to your YOLO-formatted dataset directory for validation.</p>
      </div>

      <div className="card mb-6">
        <div className="form-group mb-4">
          <label className="form-label flex items-center gap-1">
            <Folder size={16} /> Dataset Path (Absolute)
          </label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="form-input form-input-mono flex-1"
              placeholder="/data/my_dataset_v1 or C:\datasets\yolo"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
            <button className="btn btn-secondary" onClick={() => setIsBrowserOpen(true)} type="button">
              <Search size={16} /> Browse
            </button>
            <button className="btn btn-primary" onClick={() => handleValidate(path)} disabled={!path || validating}>
              {validating ? 'Validating...' : 'Validate'}
            </button>
          </div>
          <p className="form-hint">Directory must contain data.yaml, images/, and labels/ folders.</p>
        </div>
        
        <div className="form-group mb-4" style={{ borderTop: '1px solid var(--outline)', paddingTop: '16px' }}>
          <label className="form-label flex items-center gap-1 mb-2">
            Upload ZIP Archive
          </label>
          <div className="flex gap-2 items-center">
            <input 
              type="file" 
              accept=".zip" 
              onChange={handleUploadZip} 
              disabled={uploading}
              className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-container file:text-primary hover:file:bg-primary-container/80"
            />
            {uploading && <span className="text-primary body-sm">Extracting...</span>}
          </div>
          <p className="form-hint">Upload a YOLO-formatted dataset as a .zip file. It will be extracted automatically.</p>
        </div>

        {result && (
          <div className={`p-md rounded-md mt-4 ${result.valid ? 'bg-status-success/10 border-status-success' : 'bg-status-failed/10 border-status-failed'}`} style={{ border: '1px solid', backgroundColor: result.valid ? 'color-mix(in srgb, var(--status-success) 10%, transparent)' : 'color-mix(in srgb, var(--error) 10%, transparent)', borderColor: result.valid ? 'var(--status-success)' : 'var(--error)' }}>
            <div className="flex items-center gap-2 mb-2">
              {result.valid ? <CheckCircle className="text-status-success" size={20} /> : <XCircle className="text-status-failed" size={20} />}
              <h3 className="headline-sm" style={{ color: result.valid ? 'var(--status-success)' : 'var(--error)' }}>
                {result.valid ? 'Dataset Validated Successfully' : 'Validation Failed'}
              </h3>
            </div>
            
            {result.errors.length > 0 && (
              <ul className="list-disc ml-lg mt-2 text-status-failed body-sm">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            
            {result.warnings.length > 0 && (
              <ul className="list-disc ml-lg mt-2 text-status-running body-sm">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            
            {result.summary && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex flex-col gap-1">
                  <span className="label-caps text-on-surface-variant">Total Images</span>
                  <span className="mono-data">{result.summary.total_images.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="label-caps text-on-surface-variant">Total Labels</span>
                  <span className="mono-data">{result.summary.total_labels.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-1 mt-2" style={{ gridColumn: '1 / -1' }}>
                  <span className="label-caps text-on-surface-variant mb-1">Class Distribution</span>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {Object.entries(result.summary.classes).map(([name, count]) => (
                      <span key={name} className="status-chip pending">
                        {name}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-md" style={{ borderTop: '1px solid var(--outline-variant)' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/models')}>
          <ArrowLeft size={16} /> Back
        </button>
        <button 
          className="btn btn-primary" 
          disabled={!result?.valid} 
          onClick={handleNext}
        >
          Next Step: Configuration <ArrowRight size={16} />
        </button>
      </div>
      
      {isBrowserOpen && (
        <FolderBrowserModal 
          onClose={() => setIsBrowserOpen(false)}
          onSelect={(selectedPath) => {
            setPath(selectedPath);
            setIsBrowserOpen(false);
            handleValidate(selectedPath);
          }}
        />
      )}
    </div>
  );
}
