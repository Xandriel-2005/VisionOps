import { useState, useEffect } from 'react';
import { Folder, X, ArrowUp, Check, CornerDownRight } from 'lucide-react';
import api from '../api/client';

interface FolderBrowserModalProps {
  onClose: () => void;
  onSelect: (path: string) => void;
}

export function FolderBrowserModal({ onClose, onSelect }: FolderBrowserModalProps) {
  const [currentPath, setCurrentPath] = useState('');
  const [parentPath, setParentPath] = useState('');
  const [directories, setDirectories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [inputPath, setInputPath] = useState('');

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/dataset/browse', { params: { path } });
      setCurrentPath(res.data.current_path);
      setInputPath(res.data.current_path);
      setParentPath(res.data.parent_path);
      setDirectories(res.data.directories);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory('');
  }, []);

  const getNextPath = (dir: string) => {
    if (!currentPath) return dir;
    if (currentPath.endsWith('/') || currentPath.endsWith('\\')) return currentPath + dir;
    return currentPath + '/' + dir;
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPath) {
      loadDirectory(inputPath);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2 className="modal-title flex items-center gap-sm">
            <Folder size={20} style={{ color: 'var(--primary)' }} /> Select Dataset Folder
          </h2>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body flex flex-col gap-md" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 'var(--space-md)' }}>
          {/* Path input bar - pinned at top */}
          <form 
            onSubmit={handleInputSubmit}
            className="flex items-center gap-sm p-sm" 
            style={{ 
              backgroundColor: 'var(--surface-container-lowest)', 
              border: '1px solid var(--outline)',
              flexShrink: 0
            }}
          >
            <input 
              type="text"
              className="form-input form-input-mono flex-1"
              style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '4px' }}
              placeholder="Paste path here (e.g. C:\datasets) and press Enter"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary btn-sm" disabled={loading}>
              <CornerDownRight size={14} /> Go
            </button>
          </form>

          {error && (
            <div className="p-sm text-error text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--error) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--error) 20%, transparent)', flexShrink: 0 }}>
              {error}
            </div>
          )}

          {/* Directory list - scrolls independently */}
          <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--outline)', backgroundColor: 'var(--surface-container-low)', minHeight: '0' }}>
            {loading ? (
              <div className="flex items-center justify-center text-muted" style={{ height: '100%', padding: 'var(--space-lg)' }}>
                <div className="status-chip running"><div className="status-dot"></div> Loading folders...</div>
              </div>
            ) : (
              <ul style={{ listStyleType: 'none', margin: 0, padding: 0 }}>
                {parentPath && (
                  <li>
                    <button 
                      className="flex items-center gap-sm nav-item"
                      onClick={() => loadDirectory(parentPath)}
                      style={{ padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--outline-variant)' }}
                    >
                      <ArrowUp size={16} className="text-muted" />
                      <span className="mono-data">..</span>
                    </button>
                  </li>
                )}
                {directories.length === 0 && !parentPath && currentPath && (
                  <div style={{ padding: 'var(--space-lg)', textAlign: 'center', color: 'var(--on-surface-variant)' }}>No subfolders here</div>
                )}
                {directories.map((dir) => (
                  <li key={dir}>
                    <button 
                      className="flex items-center gap-sm nav-item"
                      onClick={() => loadDirectory(getNextPath(dir))}
                      style={{ padding: 'var(--space-sm) var(--space-md)', borderBottom: '1px solid var(--outline-variant)' }}
                    >
                      <Folder size={16} style={{ color: 'var(--primary)' }} />
                      <span className="mono-data">{dir}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="modal-actions" style={{ flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={() => currentPath && onSelect(currentPath)}
            disabled={!currentPath}
          >
            <Check size={16} /> Select Current Folder
          </button>
        </div>
      </div>
    </div>
  );
}
