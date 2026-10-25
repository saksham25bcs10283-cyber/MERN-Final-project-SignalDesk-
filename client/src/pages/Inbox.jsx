import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, X, Filter, Pencil, Trash2, RefreshCw, AlertCircle, CheckCircle2, Loader2, Database, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { PriorityDot, SentimentBadge } from '../components/ui';
import { FEEDBACK as DEMO_FEEDBACK } from '../data/demo';

const CATEGORIES = ['All', 'performance', 'usability', 'billing', 'bug', 'feature_request', 'other'];
const SOURCES    = ['All', 'Intercom', 'Email', 'Slack', 'Zendesk', 'Other'];
const URGENCIES  = ['All', 'low', 'medium', 'high', 'critical'];
const SENTIMENTS = ['All', 'positive', 'neutral', 'negative'];

// ── Feedback Modal (Add & Edit) ──────────────────────────────────
function FeedbackModal({ isOpen, mode = 'create', initialData = null, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    content: initialData?.content || initialData?.summary || '',
    summary: initialData?.summary || '',
    source: initialData?.source || 'Intercom',
    category: initialData?.category || 'general',
    urgency: initialData?.urgency || initialData?.priority || 'medium',
    sentiment: initialData?.sentiment || 'neutral',
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.content.trim()) {
      setError('Feedback content is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSave({
        content: form.content.trim(),
        summary: form.summary.trim() || form.content.trim().slice(0, 160),
        source: form.source,
        category: form.category,
        urgency: form.urgency,
        sentiment: form.sentiment,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save feedback');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      id="feedback-modal"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgb(0 0 0 / 0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(2px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 36px rgb(0 0 0 / 0.12)',
          width: 520,
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
        }}
      >
        <div className="flex-between" style={{ marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {mode === 'edit' ? 'Edit Feedback Record' : 'Add New Feedback'}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {mode === 'edit' ? `Updating ID: ${initialData?.id}` : 'Create a persistent record in Supabase PostgreSQL'}
            </div>
          </div>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
            id="close-modal-btn"
            style={{ padding: 4 }}
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="two-col">
            <div className="form-group">
              <label className="form-label">Source *</label>
              <select
                id="fb-source"
                className="form-input"
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
                disabled={submitting}
              >
                {SOURCES.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                id="fb-category"
                className="form-input"
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                disabled={submitting}
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="two-col">
            <div className="form-group">
              <label className="form-label">Urgency</label>
              <select
                id="fb-urgency"
                className="form-input"
                value={form.urgency}
                onChange={(e) => set('urgency', e.target.value)}
                disabled={submitting}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Sentiment</label>
              <select
                id="fb-sentiment"
                className="form-input"
                value={form.sentiment}
                onChange={(e) => set('sentiment', e.target.value)}
                disabled={submitting}
              >
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Content *</label>
            <textarea
              id="fb-content"
              className="form-input"
              rows={4}
              placeholder="Paste or enter the complete feedback text from customer..."
              value={form.content}
              onChange={(e) => set('content', e.target.value)}
              required
              disabled={submitting}
              style={{ minHeight: 90 }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Brief Summary (Optional)</label>
            <input
              id="fb-summary"
              className="form-input"
              placeholder="Short headline (defaults to first line of content)"
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="flex-between" style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              id="submit-feedback-btn"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Saving...
                </>
              ) : mode === 'edit' ? (
                'Save Changes'
              ) : (
                <>
                  <Plus size={14} /> Add Feedback
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ────────────────────────────────────
function DeleteConfirmModal({ isOpen, item, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !item) return null;

  async function handleDelete() {
    try {
      setDeleting(true);
      setError(null);
      await onConfirm(item.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete record');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      id="delete-confirm-modal"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgb(0 0 0 / 0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 36px rgb(0 0 0 / 0.12)',
          width: 440,
          padding: 24,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>
          Delete Feedback Record?
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
          Are you sure you want to permanently delete this feedback? This action cannot be undone.
        </p>

        <div
          style={{
            background: 'var(--color-bg-subtle)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 12.5,
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            ID: <span style={{ fontFamily: 'monospace' }}>{item.id}</span>
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
            "{item.summary || item.content}"
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12.5,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div className="flex-between">
          <button className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            className="btn btn-danger"
            id="confirm-delete-btn"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Deleting...
              </>
            ) : (
              <>
                <Trash2 size={13} /> Delete Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reclassify Confirmation Modal ────────────────────────────────
function ReclassifyModal({ isOpen, item, onClose, onConfirm, loading }) {
  if (!isOpen || !item) return null;

  return (
    <div
      id="reclassify-modal"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgb(0 0 0 / 0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        style={{
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 12px 36px rgb(0 0 0 / 0.12)',
          width: 460,
          padding: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>Reclassify with AI?</div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 14 }}>
          This record was previously classified
          {item.classified_at ? ` on ${new Date(item.classified_at).toLocaleDateString('en-GB')}` : ''}.
          Reclassifying will re-evaluate its category, urgency, sentiment, and summary using the AI model.
        </p>

        <div
          style={{
            background: 'var(--color-bg-subtle)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: 12.5,
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            Current: {item.category || 'Uncategorized'} • {item.urgency || item.priority || 'medium'} urgency • {item.sentiment || 'neutral'}
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
            "{item.summary || item.content}"
          </div>
        </div>

        <div className="flex-between">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(item.id, { force: true })}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={13} /> Confirm Reclassification
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────
export default function Inbox() {
  const [items, setItems]               = useState([]);
  const [totalCount, setTotalCount]     = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [successMsg, setSuccessMsg]     = useState(null);
  const [isDemoMode, setIsDemoMode]     = useState(false);

  // Filters
  const [search, setSearch]             = useState('');
  const [catFilter, setCat]             = useState('All');
  const [srcFilter, setSrc]             = useState('All');
  const [urgencyFilter, setUrgency]     = useState('All');
  const [sentimentFilter, setSentiment] = useState('All');

  // Modals & In-flight actions
  const [modalState, setModalState]     = useState({ isOpen: false, mode: 'create', data: null });
  const [deleteItem, setDeleteItem]     = useState(null);
  const [reclassifyItem, setReclassifyItem] = useState(null);
  const [classifyingId, setClassifyingId] = useState(null);

  // Fetch feedback from Express API
  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      if (search.trim()) params.search = search.trim();
      if (catFilter !== 'All') params.category = catFilter;
      if (srcFilter !== 'All') params.source = srcFilter;
      if (urgencyFilter !== 'All') params.urgency = urgencyFilter;
      if (sentimentFilter !== 'All') params.sentiment = sentimentFilter;

      const res = await api.getFeedback(params);

      if (res && res.status === 'success') {
        setItems(res.data || []);
        setTotalCount(res.pagination?.total ?? res.data?.length ?? 0);
        setIsDemoMode(false);
      }
    } catch (err) {
      console.warn('[Inbox] API load failed:', err.message);
      setError(err.message);

      // If database not configured, fallback gracefully to labelled demo data
      if (err.status === 503 || err.message.includes('Database is not configured')) {
        setIsDemoMode(true);
        // Filter demo items locally so the UI stays responsive
        const filteredDemo = DEMO_FEEDBACK.filter((f) => {
          const matchSearch = (f.author + f.company + f.summary).toLowerCase().includes(search.toLowerCase());
          const matchCat    = catFilter === 'All' || f.category === catFilter;
          const matchSrc    = srcFilter === 'All' || f.source === srcFilter;
          const matchUrg    = urgencyFilter === 'All' || (f.urgency || f.priority) === urgencyFilter;
          const matchSent   = sentimentFilter === 'All' || f.sentiment === sentimentFilter;
          return matchSearch && matchCat && matchSrc && matchUrg && matchSent;
        });
        setItems(filteredDemo);
        setTotalCount(filteredDemo.length);
      }
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, srcFilter, urgencyFilter, sentimentFilter]);

  // Load on mount and when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFeedback();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadFeedback]);

  // Auto-dismiss success message after 4s
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Create feedback
  async function handleCreate(newFeedback) {
    if (isDemoMode) {
      const demoItem = {
        ...newFeedback,
        id: `DEMO-${String(items.length + 1).padStart(3, '0')}`,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [demoItem, ...prev]);
      setTotalCount((c) => c + 1);
      setSuccessMsg('Added feedback in local demo mode (Database not configured).');
      return;
    }

    const res = await api.createFeedback(newFeedback);
    if (res?.data) {
      setSuccessMsg('Feedback record created successfully in Supabase PostgreSQL.');
      await loadFeedback();
    }
  }

  // Update feedback
  async function handleUpdate(updatedFields) {
    if (!modalState.data?.id) return;

    if (isDemoMode) {
      setItems((prev) =>
        prev.map((item) => (item.id === modalState.data.id ? { ...item, ...updatedFields } : item))
      );
      setSuccessMsg('Updated feedback in local demo mode.');
      return;
    }

    const res = await api.updateFeedback(modalState.data.id, updatedFields);
    if (res?.data) {
      setSuccessMsg('Feedback record updated successfully.');
      await loadFeedback();
    }
  }

  // Delete feedback
  async function handleDelete(id) {
    if (isDemoMode) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      setTotalCount((c) => Math.max(0, c - 1));
      setSuccessMsg('Deleted record in local demo mode.');
      return;
    }

    await api.deleteFeedback(id);
    setSuccessMsg('Feedback record deleted successfully from database.');
    await loadFeedback();
  }

  // Classify feedback with AI
  async function handleClassify(id, options = {}) {
    try {
      setClassifyingId(id);
      setError(null);

      const res = await api.classifyFeedback(id, options);
      if (res?.data) {
        setSuccessMsg(`Classified with AI: ${res.data.category} • ${res.data.urgency} urgency • ${res.data.sentiment} sentiment`);
        setReclassifyItem(null);
        await loadFeedback();
      }
    } catch (err) {
      if (err.status === 409) {
        // Record already classified, prompt for explicit reclassification
        const target = items.find((it) => it.id === id);
        if (target) setReclassifyItem(target);
      } else {
        setError(err.message || 'AI classification failed');
      }
    } finally {
      setClassifyingId(null);
    }
  }

  return (
    <div className="page-content">
      {/* Create / Edit Modal */}
      <FeedbackModal
        key={modalState.data?.id || 'new'}
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        initialData={modalState.data}
        onClose={() => setModalState({ isOpen: false, mode: 'create', data: null })}
        onSave={modalState.mode === 'create' ? handleCreate : handleUpdate}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteItem)}
        item={deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
      />

      {/* Reclassify Confirmation Modal */}
      <ReclassifyModal
        isOpen={Boolean(reclassifyItem)}
        item={reclassifyItem}
        onClose={() => setReclassifyItem(null)}
        onConfirm={(id) => handleClassify(id, { force: true })}
        loading={classifyingId === reclassifyItem?.id}
      />

      {/* Database Warning / Demo Mode Notice */}
      {isDemoMode && (
        <div
          style={{
            background: 'var(--color-warning-bg)',
            border: '1px solid #fde68a',
            color: 'var(--color-warning)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Database size={16} style={{ flexShrink: 0 }} />
            <span>
              <strong>Demo Data Active:</strong> Supabase PostgreSQL connection string (<code>DATABASE_URL</code>) is not yet set in <code>server/.env</code>. Showing static demo records.
            </span>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadFeedback}
            title="Retry connecting to API"
            style={{ fontSize: 12 }}
          >
            <RefreshCw size={12} /> Retry API
          </button>
        </div>
      )}

      {/* Server Error Banner */}
      {error && !isDemoMode && (
        <div
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid #fecaca',
            color: 'var(--color-danger)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={loadFeedback}>
            Retry
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMsg && (
        <div
          style={{
            background: 'var(--color-success-bg)',
            border: '1px solid #bbf7d0',
            color: 'var(--color-success)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => setSuccessMsg(null)} style={{ padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex-between" style={{ marginBottom: 16, gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }}
            />
            <input
              id="inbox-search"
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search feedback content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={13} style={{ color: 'var(--color-text-tertiary)' }} />
            <select
              id="cat-filter"
              className="form-input"
              style={{ width: 'auto' }}
              value={catFilter}
              onChange={(e) => setCat(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          {/* Source filter */}
          <select
            id="src-filter"
            className="form-input"
            style={{ width: 'auto' }}
            value={srcFilter}
            onChange={(e) => setSrc(e.target.value)}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Sources' : s}</option>
            ))}
          </select>

          {/* Urgency filter */}
          <select
            id="urgency-filter"
            className="form-input"
            style={{ width: 'auto' }}
            value={urgencyFilter}
            onChange={(e) => setUrgency(e.target.value)}
          >
            {URGENCIES.map((u) => (
              <option key={u} value={u}>{u === 'All' ? 'All Urgencies' : `Urgency: ${u}`}</option>
            ))}
          </select>

          {/* Sentiment filter */}
          <select
            id="sentiment-filter"
            className="form-input"
            style={{ width: 'auto' }}
            value={sentimentFilter}
            onChange={(e) => setSentiment(e.target.value)}
          >
            {SENTIMENTS.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All Sentiments' : `Sentiment: ${s}`}</option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadFeedback}
            disabled={loading}
            title="Refresh from server"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <button
          id="add-feedback-btn"
          className="btn btn-primary"
          onClick={() => setModalState({ isOpen: true, mode: 'create', data: null })}
        >
          <Plus size={14} /> Add Feedback
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Feedback Records</div>
            <div className="card-subtitle">
              {loading ? 'Fetching records...' : `${items.length} ${isDemoMode ? 'demo' : 'database'} entries displayed (${totalCount} total)`}
            </div>
          </div>
          {isDemoMode && (
            <span className="badge badge-warning" style={{ fontSize: 11 }}>
              Demo Preview Mode
            </span>
          )}
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th style={{ width: 100 }}>ID</th>
                <th>Content & Summary</th>
                <th>Source</th>
                <th>Category</th>
                <th>Urgency</th>
                <th>Sentiment</th>
                <th>Date</th>
                <th style={{ textAlign: 'right', width: 180 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
                      <span>Loading feedback records from API...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-tertiary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>No feedback records found</div>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', maxWidth: 360 }}>
                        {search || catFilter !== 'All' || srcFilter !== 'All' || urgencyFilter !== 'All' || sentimentFilter !== 'All'
                          ? 'Try adjusting your search query or filters.'
                          : 'Your database table is ready. Click "Add Feedback" to create your first record.'}
                      </p>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 6 }}
                        onClick={() => setModalState({ isOpen: true, mode: 'create', data: null })}
                      >
                        <Plus size={13} /> Add First Feedback
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((f) => {
                  const displayId = typeof f.id === 'string' && f.id.length > 12 ? `${f.id.slice(0, 8)}…` : f.id;
                  const displayUrgency = f.urgency || f.priority || 'medium';
                  const dateStr = f.created_at
                    ? new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : f.date || '—';

                  return (
                    <tr key={f.id}>
                      <td
                        style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-tertiary)' }}
                        title={f.id}
                      >
                        {displayId}
                      </td>
                      <td style={{ maxWidth: 360 }}>
                        <div style={{ fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.4, fontWeight: 500, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span>{f.summary || f.content}</span>
                          {f.classified_at && (
                            <span
                              className="badge badge-info"
                              style={{ fontSize: 10, padding: '1px 5px', gap: 3 }}
                              title={`AI Classified on ${new Date(f.classified_at).toLocaleString()}`}
                            >
                              <Sparkles size={9} /> AI
                            </span>
                          )}
                        </div>
                        {f.content && f.summary && f.content !== f.summary && (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--color-text-secondary)',
                              marginTop: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {f.content}
                          </div>
                        )}
                        {f.author && (
                          <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                            {f.author} {f.company ? `(${f.company})` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>{f.source}</td>
                      <td style={{ fontSize: 12.5 }}>{f.category || 'General'}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PriorityDot level={displayUrgency === 'critical' ? 'high' : displayUrgency} />
                          <span style={{ fontSize: 12.5, textTransform: 'capitalize' }}>{displayUrgency}</span>
                        </div>
                      </td>
                      <td>
                        <SentimentBadge sentiment={f.sentiment || 'neutral'} />
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {/* Classify with AI / Reclassify button */}
                          {f.classified_at ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              title={`AI Classified on ${new Date(f.classified_at).toLocaleString()}. Click to reclassify.`}
                              onClick={() => setReclassifyItem(f)}
                              disabled={classifyingId === f.id}
                              style={{ padding: '3px 7px', fontSize: 12, color: 'var(--color-accent)' }}
                            >
                              {classifyingId === f.id ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" /> Analyzing...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} /> Reclassify
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Classify with AI"
                              onClick={() => handleClassify(f.id)}
                              disabled={classifyingId === f.id}
                              style={{ padding: '3px 8px', fontSize: 12 }}
                            >
                              {classifyingId === f.id ? (
                                <>
                                  <Loader2 size={12} className="animate-spin" /> Analyzing...
                                </>
                              ) : (
                                <>
                                  <Sparkles size={12} /> Classify
                                </>
                              )}
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Edit feedback"
                            onClick={() => setModalState({ isOpen: true, mode: 'edit', data: f })}
                            style={{ padding: '4px 6px' }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className="btn btn-danger-ghost btn-sm"
                            title="Delete feedback"
                            onClick={() => setDeleteItem(f)}
                            style={{ padding: '4px 6px' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
