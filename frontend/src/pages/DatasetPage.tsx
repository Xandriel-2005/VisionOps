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
        <p className="body-md text-muted">Point to your YOLO-formatted dataset directory for validation.</p>
      </div>

      <div className="card mb-lg">
        <div className="form-group mb-md">
          <label className="form-label flex items-center gap-xs">
            <Folder size={16} /> Dataset Path (Absolute)
          </label>
          <div className="flex gap-sm">
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

        {result && (
          <div className={`p-md rounded-md mt-md ${result.valid ? 'bg-status-success/10 border-status-success' : 'bg-status-failed/10 border-status-failed'}`} style={{ border: '1px solid', backgroundColor: result.valid ? 'color-mix(in srgb, var(--status-success) 10%, transparent)' : 'color-mix(in srgb, var(--error) 10%, transparent)', borderColor: result.valid ? 'var(--status-success)' : 'var(--error)' }}>
            <div className="flex items-center gap-sm mb-sm">
              {result.valid ? <CheckCircle className="text-status-success" size={20} /> : <XCircle className="text-error" size={20} />}
              <h3 className="headline-sm" style={{ color: result.valid ? 'var(--status-success)' : 'var(--error)' }}>
                {result.valid ? 'Dataset Validated Successfully' : 'Validation Failed'}
              </h3>
            </div>
            
            {result.errors.length > 0 && (
              <ul className="list-disc ml-lg mt-sm text-error body-sm">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            
            {result.warnings.length > 0 && (
              <ul className="list-disc ml-lg mt-sm text-status-running body-sm">
                {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            )}
            
            {result.summary && (
              <div className="grid-2 mt-md">
                <div className="flex flex-col gap-xs">
                  <span className="label-caps text-muted">Total Images</span>
                  <span className="mono-data">{result.summary.total_images.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-xs">
                  <span className="label-caps text-muted">Total Labels</span>
                  <span className="mono-data">{result.summary.total_labels.toLocaleString()}</span>
                </div>
                <div className="flex flex-col gap-xs mt-sm" style={{ gridColumn: '1 / -1' }}>
                  <span className="label-caps text-muted mb-xs">Class Distribution</span>
                  <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
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
