import { useState, useEffect } from 'react';
import { Server, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';
import api from '../api/client';
import type { GPUProfile } from '../types';

export function SettingsPage() {
  const [profiles, setProfiles] = useState<GPUProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [venvPath, setVenvPath] = useState('');
  
  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const res = await api.get<GPUProfile[]>('/api/gpu-profiles');
      setProfiles(res.data);
    } catch (err) {
      console.error('Failed to load GPU profiles', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setHost('');
    setUsername('');
    setKeyPath('');
    setVenvPath('');
    setEditingId(null);
  };

  const handleEdit = (profile: GPUProfile) => {
    setEditingId(profile.id);
    setName(profile.name);
    setHost(profile.host);
    setUsername(profile.username);
    setKeyPath(profile.ssh_key_path);
    setVenvPath(profile.venv_path || '');
  };

  const handleSave = async () => {
    try {
      const payload = {
        name,
        host,
        username,
        ssh_key_path: keyPath,
        venv_path: venvPath || null
      };
      
      if (editingId) {
        await api.put(`/api/gpu-profiles/${editingId}`, payload);
      } else {
        await api.post('/api/gpu-profiles', payload);
      }
      
      await fetchProfiles();
      resetForm();
    } catch (err) {
      console.error('Failed to save profile', err);
    }
  };

  const handleDelete = async (_id: number) => {
    if (!window.confirm("Are you sure you want to delete this profile?")) return;
    try {
      // Note: Assuming delete route exists in router (we didn't explicitly implement delete in the scaffold, but normally we would)
      // For scaffold, we can just hide it or implement the delete endpoint later
      // await api.delete(`/api/gpu-profiles/${_id}`);
      alert("Delete endpoint not implemented in scaffold router yet.");
    } catch (err) {
      console.error('Failed to delete profile', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p className="body-md text-muted">Manage remote GPU profiles for executing training jobs.</p>
      </div>

      <div className="grid-2">
        <div className="flex flex-col gap-md">
          {profiles.length === 0 ? (
            <div className="card text-center py-lg text-muted">
              <Server size={32} className="mx-auto mb-sm opacity-50" />
              <p>No GPU profiles configured.</p>
            </div>
          ) : (
            profiles.map(profile => (
              <div key={profile.id} className="card flex justify-between items-start" style={{ border: editingId === profile.id ? '1px solid var(--primary)' : undefined }}>
                <div>
                  <h3 className="headline-sm flex items-center gap-xs"><Server size={16} className="text-primary" /> {profile.name}</h3>
                  <div className="mt-sm flex flex-col gap-xs">
                    <span className="mono-sm text-muted">Host: {profile.host}</span>
                    <span className="mono-sm text-muted">User: {profile.username}</span>
                  </div>
                </div>
                <div className="flex gap-sm">
                  <button className="btn btn-ghost" style={{ padding: '8px' }} onClick={() => handleEdit(profile)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn btn-ghost text-error" style={{ padding: '8px' }} onClick={() => handleDelete(profile.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card h-fit">
          <h3 className="headline-sm mb-md">{editingId ? 'Edit Profile' : 'New GPU Profile'}</h3>
          
          <div className="flex flex-col gap-md">
            <div className="form-group">
              <label className="label-caps">Profile Name</label>
              <input type="text" className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AWS A100 Instance" />
            </div>
            
            <div className="form-group">
              <label className="label-caps">Host / IP Address</label>
              <input type="text" className="input" value={host} onChange={e => setHost(e.target.value)} placeholder="e.g. 192.168.1.100 or ec2-..." />
            </div>
            
            <div className="grid-2 gap-sm">
              <div className="form-group">
                <label className="label-caps">SSH Username</label>
                <input type="text" className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. ubuntu" />
              </div>
              
              <div className="form-group">
                <label className="label-caps">Private Key Path</label>
                <input type="text" className="input" value={keyPath} onChange={e => setKeyPath(e.target.value)} placeholder="e.g. ~/.ssh/id_rsa" />
              </div>
            </div>
            
            <div className="form-group">
              <label className="label-caps">Virtual Env Path (Optional)</label>
              <input type="text" className="input" value={venvPath} onChange={e => setVenvPath(e.target.value)} placeholder="e.g. /home/ubuntu/venv" />
            </div>
            
            <div className="flex gap-sm mt-sm">
              <button 
                className="btn btn-primary flex-1" 
                onClick={handleSave}
                disabled={!name || !host || !username || !keyPath}
              >
                <Save size={16} className="mr-xs" /> Save Profile
              </button>
              
              {editingId && (
                <button className="btn btn-secondary" onClick={resetForm}>
                  <X size={16} /> Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
