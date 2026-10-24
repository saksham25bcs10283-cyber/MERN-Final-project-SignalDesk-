import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Lightbulb,
  CheckSquare,
  Settings,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',        icon: LayoutDashboard, label: 'Overview' },
  { to: '/inbox',   icon: MessageSquare,  label: 'Feedback Inbox', badge: '3' },
  { to: '/insights',icon: Lightbulb,      label: 'AI Insights' },
  { to: '/actions', icon: CheckSquare,    label: 'Actions' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={14} strokeWidth={2.5} />
        </div>
        <div>
          <div className="sidebar-logo-name">SignalDesk</div>
          <div className="sidebar-logo-tag">Demo workspace</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-section" style={{ flex: 1 }}>
        <div className="sidebar-section-label">Navigation</div>
        {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }
          >
            <Icon size={15} strokeWidth={1.8} />
            {label}
            {badge && <span className="nav-badge">{badge}</span>}
          </NavLink>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: '20px' }}>Settings</div>
        <button className="sidebar-nav-item">
          <Settings size={15} strokeWidth={1.8} />
          Settings
        </button>
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">SL</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Saksham Lodha</div>
            <div className="sidebar-user-role">Product Manager</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
