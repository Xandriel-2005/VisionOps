import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Folder, CheckCircle, XCircle, ArrowRight, ArrowLeft, Search, CornerLeftUp, X } from 'lucide-react';
import api from '../api/client';
import type { ValidationResult } from '../types';

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

  // Browser state
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserData, setBrowserData] = useState<{current_path: string, parent_path: string, directories: string[]} | null>(null);
  const [browserLoading, setBrowserLoading] = useState(false);

  const fetchBrowse = async (targetPath: string) => {
    setBrowserLoading(true);
    try {
      const res = await api.get('/api/dataset/browse', { params: { path: targetPath } });
      setBrowserData(res.data);
      setBrowserPath(res.data.current_path);
    } catch (err) {
      console.error('Failed to browse', err);
      // fallback just close or ignore
    } finally {
      setBrowserLoading(false);
    }
  };

  const openBrowser = () => {
    setBrowserOpen(true);
    fetchBrowse(path || '');
  };

  const handleSelectFolder = () => {
    if (browserData) {
      setPath(browserData.current_path);
      setBrowserOpen(false);
      handleValidate(browserData.current_path);
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
            <button className="btn btn-secondary" onClick={openBrowser} type="button">
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
                  <div className="flex gap-sm flex-wrap">
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

      {browserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="card w-full max-w-2xl shadow-xl flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="flex justify-between items-center mb-md pb-sm" style={{ borderBottom: '1px solid var(--outline-variant)' }}>
              <h2 className="headline-sm flex items-center gap-xs"><Folder size={20} className="text-primary"/> Browse Server Filesystem</h2>
              <button className="btn btn-ghost p-xs" onClick={() => setBrowserOpen(false)}><X size={20}/></button>
            </div>
            
            <div className="flex gap-sm mb-md">
              <button 
                className="btn btn-secondary p-sm" 
                disabled={!browserData?.parent_path}
                onClick={() => fetchBrowse(browserData?.parent_path || '')}
              >
                <CornerLeftUp size={16} />
              </button>
              <input 
                type="text" 
                className="form-input form-input-mono flex-1" 
                value={browserPath}
                onChange={e => setBrowserPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchBrowse(browserPath)}
              />
              <button className="btn btn-primary" onClick={() => fetchBrowse(browserPath)}>Go</button>
            </div>
            
            <div className="flex-1 overflow-y-auto border rounded-md p-sm" style={{ borderColor: 'var(--outline-variant)', minHeight: '300px' }}>
              {browserLoading ? (
                <div className="flex h-full items-center justify-center text-muted">Loading...</div>
              ) : browserData?.directories.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted">No subdirectories found.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-xs">
                  {browserData?.directories.map(dir => (
                    <div 
                      key={dir} 
                      className="flex items-center gap-sm p-sm rounded-md cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => fetchBrowse(browserData.current_path ? `${browserData.current_path}\\${dir}`.replace('\\\\', '\\') : dir)}
                    >
                      <Folder size={16} className="text-primary" />
                      <span className="truncate flex-1" title={dir}>{dir}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-sm mt-md pt-sm" style={{ borderTop: '1px solid var(--outline-variant)' }}>
              <button className="btn btn-ghost" onClick={() => setBrowserOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSelectFolder} disabled={!browserData?.current_path}>
                Select This Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
