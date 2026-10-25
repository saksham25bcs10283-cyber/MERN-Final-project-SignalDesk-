import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Calendar, User, Plus, Trash2, AlertCircle, RefreshCw, Filter, X } from 'lucide-react';
import { PriorityDot, StatusBadge } from '../components/ui';
import { api } from '../services/api';

// ── Constants ─────────────────────────────────────────────────────
const STATUS_CYCLE = { todo: 'in_progress', in_progress: 'done', done: 'cancelled', cancelled: 'todo' };
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
const STATUS_OPTIONS   = ['todo', 'in_progress', 'done', 'cancelled'];

// ── Stat summary ──────────────────────────────────────────────────
function ActionStats({ stats, loading }) {
  const items = [
    { label: 'Total actions', value: loading ? '…' : (stats?.total ?? 0) },
    { label: 'Completed',     value: loading ? '…' : (stats?.done ?? 0),        color: 'var(--color-success)' },
    { label: 'In progress',   value: loading ? '…' : (stats?.in_progress ?? 0), color: 'var(--color-accent)' },
    { label: 'To-do',         value: loading ? '…' : (stats?.todo ?? 0),        color: 'var(--color-text-secondary)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
      {items.map((s) => (
        <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
          <div className="stat-label">{s.label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: s.color ?? 'var(--color-text)' }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Single action row ─────────────────────────────────────────────
function ActionRow({ action, onCycleStatus, onDelete, cycling }) {
  const dueLabel = action.due_date
    ? new Date(action.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="action-item" id={`action-${action.id}`}>
      {/* Status toggle checkbox */}
      <button
        id={`check-${action.id}`}
        className={`action-checkbox${action.status === 'done' ? ' checked' : ''}`}
        onClick={() => onCycleStatus(action)}
        disabled={cycling === action.id}
        title={`Status: ${action.status} — click to advance`}
      >
        {action.status === 'done' && <Check size={10} strokeWidth={3} />}
      </button>

      {/* Body */}
      <div className="action-body">
        <div className={`action-title${action.status === 'done' ? ' done' : ''}`}>{action.title}</div>
        {action.description && (
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2, marginBottom: 2, lineHeight: 1.4 }}>
            {action.description}
          </div>
        )}
        <div className="action-meta">
          <span className="action-meta-item">
            <PriorityDot level={action.priority} />
            {action.priority}
          </span>
          {action.owner && (
            <span className="action-meta-item">
              <User size={11} /> {action.owner}
            </span>
          )}
          {dueLabel && (
            <span className="action-meta-item">
              <Calendar size={11} /> {dueLabel}
            </span>
          )}
          {action.insight_title && (
            <span className="action-meta-item" style={{ color: 'var(--color-accent)', fontStyle: 'italic' }}>
              ↳ {action.insight_title}
            </span>
          )}
        </div>
      </div>

      <StatusBadge status={action.status} />

      <button
        id={`delete-${action.id}`}
        className="btn btn-ghost btn-sm"
        onClick={() => onDelete(action)}
        title="Delete action"
        style={{ padding: 4, color: 'var(--color-text-tertiary)', marginLeft: 4 }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Create Action Modal ───────────────────────────────────────────
function CreateActionModal({ prefill, onClose, onCreate }) {
  const [form, setForm] = useState({
    title:       prefill?.title       ?? '',
    description: prefill?.description ?? '',
    owner:       prefill?.owner       ?? '',
    priority:    prefill?.priority    ?? 'medium',
    status:      'todo',
    due_date:    '',
    insight_id:  prefill?.insight_id  ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title:      form.title.trim(),
        description: form.description.trim() || undefined,
        owner:      form.owner.trim()       || undefined,
        priority:   form.priority,
        status:     form.status,
        due_date:   form.due_date           || undefined,
        insight_id: form.insight_id         || undefined,
      };
      const res = await api.createAction(payload);
      onCreate(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create action.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--color-bg-subtle)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--color-text)',
    fontSize: 13,
    boxSizing: 'border-box',
  };
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        width: '100%',
        maxWidth: 480,
        boxShadow: 'var(--shadow-lg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>New Action</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}><X size={16} /></button>
        </div>

        {prefill?.insight_title && (
          <div style={{
            fontSize: 12, padding: '6px 10px', marginBottom: 16,
            background: 'var(--color-accent-light)', color: 'var(--color-accent)',
            borderRadius: 'var(--radius-sm)', fontStyle: 'italic',
          }}>
            Linked to insight: {prefill.insight_title}
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input id="action-title" style={inputStyle} value={form.title} onChange={set('title')} maxLength={255} placeholder="Action title…" />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <textarea id="action-desc" style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={form.description} onChange={set('description')} placeholder="Optional details…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select id="action-priority" style={inputStyle} value={form.priority} onChange={set('priority')}>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select id="action-status" style={inputStyle} value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Owner</label>
              <input id="action-owner" style={inputStyle} value={form.owner} onChange={set('owner')} maxLength={100} placeholder="Name or team…" />
            </div>
            <div>
              <label style={labelStyle}>Due date</label>
              <input id="action-due" style={inputStyle} type="date" value={form.due_date} onChange={set('due_date')} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} style={{ border: '1px solid var(--color-border)' }}>
              Cancel
            </button>
            <button id="btn-save-action" type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving…' : 'Create Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function Actions() {
  const location = useLocation();
  const prefill  = location.state?.actionPrefill ?? null; // from Insights page "Create Action"

  const [actions,      setActions]      = useState([]);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error,        setError]        = useState(null);
  const [cycling,      setCycling]      = useState(null); // id of action being updated
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority,setFilterPriority] = useState('');
  const [showCreate,   setShowCreate]   = useState(!!prefill); // auto-open if navigated from Insights
  const [notice,       setNotice]       = useState(null);

  // Load actions list
  const loadActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getActions({ status: filterStatus, priority: filterPriority });
      setActions(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load actions.');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority]);

  // Load stats
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.getActionStats();
      setStats(res.data ?? null);
    } catch {
      // stats failure is non-fatal; show zeros
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { loadActions(); }, [loadActions]);
  useEffect(() => { loadStats();   }, [loadStats]);

  // Advance status along cycle
  const handleCycleStatus = async (action) => {
    const nextStatus = STATUS_CYCLE[action.status] ?? 'todo';
    setCycling(action.id);
    try {
      const res = await api.updateAction(action.id, { status: nextStatus });
      setActions((prev) => prev.map((a) => a.id === action.id ? res.data : a));
      loadStats();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to update status.' });
    } finally {
      setCycling(null);
    }
  };

  // Delete with confirmation
  const handleDelete = async (action) => {
    if (!window.confirm(`Delete action "${action.title}"?\nThis cannot be undone.`)) return;
    try {
      await api.deleteAction(action.id);
      setActions((prev) => prev.filter((a) => a.id !== action.id));
      setNotice({ type: 'success', text: 'Action deleted.' });
      loadStats();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Failed to delete action.' });
    }
  };

  // After create
  const handleCreated = (newAction) => {
    setActions((prev) => [newAction, ...prev]);
    setNotice({ type: 'success', text: `Action "${newAction.title}" created.` });
    loadStats();
  };

  // Group by priority (urgent first)
  const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...actions].sort(
    (a, b) => (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9)
  );

  return (
    <div className="page-content">
      {/* Stats */}
      <ActionStats stats={stats} loading={statsLoading} />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>Action Workflows</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Track product work generated from customer insights.</p>
        </div>
        <button
          id="btn-new-action"
          className="btn btn-primary btn-sm"
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={13} /> New Action
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Filter size={13} style={{ color: 'var(--color-text-tertiary)' }} />
        <select
          id="filter-status"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '5px 10px', fontSize: 12,
            background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--color-text)',
          }}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select
          id="filter-priority"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{
            padding: '5px 10px', fontSize: 12,
            background: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--color-text)',
          }}
        >
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {(filterStatus || filterPriority) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setFilterStatus(''); setFilterPriority(''); }}
            style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Notice banner */}
      {notice && (
        <div style={{
          fontSize: 13, padding: '8px 12px', marginBottom: 16, borderRadius: 'var(--radius-sm)',
          background: notice.type === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
          color:      notice.type === 'error' ? 'var(--color-danger)'    : 'var(--color-success)',
          border: `1px solid ${notice.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{notice.text}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setNotice(null)} style={{ padding: 2 }}><X size={13} /></button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 20,
          background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)',
          borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-danger)',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
          <button className="btn btn-ghost btn-sm" onClick={loadActions} style={{ marginLeft: 'auto', fontSize: 12 }}>Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div>Loading actions…</div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && actions.length === 0 && (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          background: 'var(--color-bg)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--color-accent-light)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <Check size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
            {filterStatus || filterPriority ? 'No matching actions' : 'No actions yet'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 380, margin: '0 auto 20px', lineHeight: 1.6 }}>
            {filterStatus || filterPriority
              ? 'Try clearing the filters above.'
              : 'Create your first action or generate one from an Insight.'}
          </p>
          {!(filterStatus || filterPriority) && (
            <button id="btn-empty-create" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Plus size={14} /> Create Action
            </button>
          )}
        </div>
      )}

      {/* Action list */}
      {!loading && actions.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {sorted.map((action) => (
            <ActionRow
              key={action.id}
              action={action}
              onCycleStatus={handleCycleStatus}
              onDelete={handleDelete}
              cycling={cycling}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateActionModal
          prefill={prefill}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreated}
        />
      )}
    </div>
  );
}
