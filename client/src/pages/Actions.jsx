import { useState } from 'react';
import { Check, Calendar, User } from 'lucide-react';
import { ACTIONS } from '../data/demo';
import { PriorityDot, StatusBadge } from '../components/ui';

// ── Stat summary ──────────────────────────────────────────────────
function ActionStats({ items }) {
  const total    = items.length;
  const done     = items.filter((a) => a.done).length;
  const inProg   = items.filter((a) => a.status === 'in-progress').length;
  const todo     = items.filter((a) => a.status === 'todo').length;
  const pct      = Math.round((done / total) * 100);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap: 14,
        marginBottom: 24,
      }}
    >
      {[
        { label: 'Total actions', value: total },
        { label: 'Completed',     value: done, color: 'var(--color-success)' },
        { label: 'In progress',   value: inProg, color: 'var(--color-accent)' },
        { label: 'To-do',         value: todo,  color: 'var(--color-text-secondary)' },
      ].map((s) => (
        <div
          key={s.label}
          className="card"
          style={{ padding: '14px 18px' }}
        >
          <div className="stat-label">{s.label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: s.color ?? 'var(--color-text)' }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Group by theme ────────────────────────────────────────────────
function groupByTheme(items) {
  const map = {};
  items.forEach((a) => {
    if (!map[a.theme]) map[a.theme] = [];
    map[a.theme].push(a);
  });
  return Object.entries(map);
}

// ── Single action row ─────────────────────────────────────────────
function ActionRow({ action, onToggle }) {
  return (
    <div className="action-item" id={`action-${action.id}`}>
      {/* Checkbox */}
      <button
        id={`check-${action.id}`}
        className={`action-checkbox${action.done ? ' checked' : ''}`}
        onClick={() => onToggle(action.id)}
        title={action.done ? 'Mark as incomplete' : 'Mark as done'}
      >
        {action.done && <Check size={10} strokeWidth={3} />}
      </button>

      {/* Body */}
      <div className="action-body">
        <div className={`action-title${action.done ? ' done' : ''}`}>{action.title}</div>
        <div className="action-meta">
          <span className="action-meta-item">
            <PriorityDot level={action.priority} />
            {action.priority}
          </span>
          <span className="action-meta-item">
            <User size={11} /> {action.assignee}
          </span>
          <span className="action-meta-item">
            <Calendar size={11} /> {action.due}
          </span>
        </div>
      </div>

      {/* Status */}
      <StatusBadge status={action.status} />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function Actions() {
  const [items, setItems] = useState(ACTIONS);

  function toggleDone(id) {
    setItems((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, done: !a.done, status: !a.done ? 'done' : 'in-progress' }
          : a
      )
    );
  }

  const groups = groupByTheme(items);

  return (
    <div className="page-content">
      <ActionStats items={items} />

      <div className="gap-y-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {groups.map(([theme, actions]) => (
          <div key={theme} className="card">
            {/* Theme header */}
            <div className="card-header">
              <div>
                <div className="card-title">{theme}</div>
                <div className="card-subtitle">
                  {actions.filter((a) => a.done).length} / {actions.length} completed
                </div>
              </div>
              {/* Mini progress */}
              <div style={{ width: 80 }}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textAlign: 'right', marginBottom: 4 }}>
                  {Math.round((actions.filter((a) => a.done).length / actions.length) * 100)}%
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${(actions.filter((a) => a.done).length / actions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Action rows */}
            {actions.map((action) => (
              <ActionRow key={action.id} action={action} onToggle={toggleDone} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
