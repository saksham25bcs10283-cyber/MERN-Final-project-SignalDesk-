import { useState } from 'react';
import { Search, Plus, X, Filter } from 'lucide-react';
import { FEEDBACK } from '../data/demo';
import { PriorityDot, SentimentBadge, StatusBadge } from '../components/ui';

const CATEGORIES = ['All', 'Performance', 'Feature Request', 'UX', 'Bug', 'Billing'];
const SOURCES    = ['All', 'Intercom', 'Email', 'Slack'];

// ── Add-feedback form modal ───────────────────────────────────────
function AddFeedbackModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    author: '', company: '', source: 'Intercom',
    category: 'Performance', priority: 'medium', summary: '',
  });

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.author || !form.summary) return;
    onAdd({
      ...form,
      id: `FB-${String(FEEDBACK.length + 1).padStart(3, '0')}`,
      sentiment: 'neutral',
      status: 'open',
      date: new Date().toISOString().slice(0, 10),
    });
    onClose();
  }

  return (
    <div
      id="add-feedback-modal"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgb(0 0 0 / 0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgb(0 0 0 / 0.10)',
          width: 480,
          padding: 24,
        }}
      >
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Add Feedback</div>
          <button className="btn btn-ghost" onClick={onClose} id="close-modal-btn">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="two-col">
            <div className="form-group">
              <label className="form-label">Author *</label>
              <input
                id="fb-author"
                className="form-input"
                placeholder="e.g. Jane Smith"
                value={form.author}
                onChange={(e) => set('author', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input
                id="fb-company"
                className="form-input"
                placeholder="e.g. Acme Corp"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
              />
            </div>
          </div>

          <div className="two-col">
            <div className="form-group">
              <label className="form-label">Source</label>
              <select id="fb-source" className="form-input" value={form.source} onChange={(e) => set('source', e.target.value)}>
                {['Intercom', 'Email', 'Slack', 'Other'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select id="fb-category" className="form-input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {['Performance', 'Feature Request', 'UX', 'Bug', 'Billing'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Priority</label>
            <select id="fb-priority" className="form-input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Feedback summary *</label>
            <textarea
              id="fb-summary"
              className="form-input"
              placeholder="Describe the customer's feedback in a few sentences…"
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              required
            />
          </div>

          <div className="flex-between" style={{ marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" id="submit-feedback-btn">
              <Plus size={14} /> Add Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function Inbox() {
  const [items, setItems]       = useState(FEEDBACK);
  const [search, setSearch]     = useState('');
  const [catFilter, setCat]     = useState('All');
  const [srcFilter, setSrc]     = useState('All');
  const [showModal, setModal]   = useState(false);

  const filtered = items.filter((f) => {
    const matchSearch = (f.author + f.company + f.summary).toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'All' || f.category === catFilter;
    const matchSrc    = srcFilter === 'All' || f.source === srcFilter;
    return matchSearch && matchCat && matchSrc;
  });

  return (
    <div className="page-content">
      {showModal && (
        <AddFeedbackModal
          onClose={() => setModal(false)}
          onAdd={(item) => setItems((prev) => [item, ...prev])}
        />
      )}

      {/* Toolbar */}
      <div className="flex-between" style={{ marginBottom: 16, gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}
            />
            <input
              id="inbox-search"
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search feedback…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} style={{ color: 'var(--color-text-tertiary)' }} />
            <select id="cat-filter" className="form-input" style={{ width: 'auto' }} value={catFilter} onChange={(e) => setCat(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Source filter */}
          <select id="src-filter" className="form-input" style={{ width: 'auto' }} value={srcFilter} onChange={(e) => setSrc(e.target.value)}>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <button id="add-feedback-btn" className="btn btn-primary" onClick={() => setModal(true)}>
          <Plus size={14} /> Add Feedback
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Feedback Items</div>
            <div className="card-subtitle">{filtered.length} of {items.length} entries</div>
          </div>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Summary</th>
                <th>Author</th>
                <th>Source</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Sentiment</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-tertiary)' }}>
                    No feedback matches your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{f.id}</td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.4 }}>{f.summary}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{f.author}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{f.company}</div>
                    </td>
                    <td style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>{f.source}</td>
                    <td style={{ fontSize: 12.5 }}>{f.category}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PriorityDot level={f.priority} />
                        <span style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{f.priority}</span>
                      </div>
                    </td>
                    <td><SentimentBadge sentiment={f.sentiment} /></td>
                    <td><StatusBadge status={f.status} /></td>
                    <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{f.date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
