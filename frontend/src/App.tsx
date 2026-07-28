import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { useTheme } from './hooks/useTheme';

// Placeholder pages — will be built in Phase 2–4
function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="page-header">
        <h1>{title}</h1>
        <p className="body-md text-muted">{description}</p>
      </div>
      <div className="card" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
        <p className="headline-sm" style={{ marginBottom: 'var(--space-sm)' }}>🚧</p>
        <p className="body-md text-muted">This page will be built in Phase 2–4</p>
      </div>
    </div>
  );
}

function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/models" replace />} />
            <Route path="/models" element={<PlaceholderPage title="Models" description="Select a base detection model for training" />} />
            <Route path="/dataset" element={<PlaceholderPage title="Dataset" description="Configure and validate your training dataset" />} />
            <Route path="/config" element={<PlaceholderPage title="Configuration" description="Set training hyperparameters and run options" />} />
            <Route path="/launch" element={<PlaceholderPage title="Launch" description="Review and launch your training run" />} />
            <Route path="/tracking" element={<PlaceholderPage title="Tracking" description="Monitor active training runs" />} />
            <Route path="/history" element={<PlaceholderPage title="Run History" description="View and manage past training runs" />} />
            <Route path="/inference" element={<PlaceholderPage title="Inference" description="Run object detection on images and video" />} />
            <Route path="/settings" element={<PlaceholderPage title="Settings" description="Manage GPU profiles and preferences" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
