import { useLocation } from 'react-router-dom';
import { Bell, HelpCircle } from 'lucide-react';

const TITLES = {
  '/':         { title: 'Overview', sub: 'Feedback intelligence summary' },
  '/inbox':    { title: 'Feedback Inbox', sub: 'All incoming customer signals' },
  '/insights': { title: 'AI Insights', sub: 'Clustered themes & supporting evidence' },
  '/actions':  { title: 'Actions', sub: 'Tasks generated from feedback clusters' },
};

export default function Topbar() {
  const { pathname } = useLocation();
  const { title, sub } = TITLES[pathname] ?? { title: 'SignalDesk', sub: '' };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '1px' }}>{sub}</div>}
      </div>
      <div className="topbar-meta">
        <span className="topbar-date">{dateStr}</span>
        <button className="btn-ghost btn" title="Notifications" id="topbar-notifications">
          <Bell size={16} strokeWidth={1.8} />
        </button>
        <button className="btn-ghost btn" title="Help" id="topbar-help">
          <HelpCircle size={16} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
