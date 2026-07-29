import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { useTheme } from './hooks/useTheme';
import { ModelsPage } from './pages/ModelsPage';
import { DatasetPage } from './pages/DatasetPage';
import { ConfigPage } from './pages/ConfigPage';
import { LaunchPage } from './pages/LaunchPage';
import { TrackingPage } from './pages/TrackingPage';
import { HistoryPage } from './pages/HistoryPage';
import { InferencePage } from './pages/InferencePage';
import { SettingsPage } from './pages/SettingsPage';


function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/models" replace />} />
            <Route path="/models" element={<ModelsPage />} />
            <Route path="/dataset" element={<DatasetPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/launch" element={<LaunchPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/inference" element={<InferencePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
