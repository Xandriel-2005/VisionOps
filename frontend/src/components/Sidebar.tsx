import { NavLink } from 'react-router-dom';
import {
  Cpu,
  Database,
  Settings2,
  Rocket,
  BarChart3,
  History,
  Scan,
  Server,
  Eye,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const navSections = [
  {
    label: 'Pipeline',
    items: [
      { to: '/models', icon: Cpu, label: 'Models' },
      { to: '/dataset', icon: Database, label: 'Dataset' },
      { to: '/config', icon: Settings2, label: 'Config' },
      { to: '/launch', icon: Rocket, label: 'Launch' },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { to: '/tracking', icon: BarChart3, label: 'Tracking' },
      { to: '/history', icon: History, label: 'History' },
    ],
  },
  {
    label: 'Use',
    items: [
      { to: '/inference', icon: Scan, label: 'Inference' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', icon: Server, label: 'Settings' },
    ],
  },
];

export function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Eye size={22} className="logo-icon" />
          <span>VisionOps</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item${isActive ? ' active' : ''}`
                }
              >
                <item.icon size={18} className="nav-icon" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer flex items-center justify-between">
        <span className="body-sm text-on-surface-variant">v0.1.0</span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </aside>
  );
}
