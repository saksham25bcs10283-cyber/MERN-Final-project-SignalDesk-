import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Sparkles,
  RefreshCw,
  Trash2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { PriorityDot, Badge, SentimentBadge } from '../components/ui';
import { api } from '../services/api';

// ── Theme card ────────────────────────────────────────────────────
function ThemeCard({ theme, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Delete insight "${theme.title}"?`)) return;
    try {
      setDeleting(true);
      await api.deleteInsight(theme.id);
      onDelete(theme.id);
    } catch (err) {
      alert(`Failed to delete insight: ${err.message}`);
      setDeleting(false);
    }
  };

  const severityVariant =
    theme.severity === 'critical' || theme.severity === 'high'
      ? 'danger'
      : theme.severity === 'medium'
      ? 'warning'
      : 'default';

  return (
    <div className="theme-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div className="theme-card-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <PriorityDot level={theme.severity} />
            <div className="theme-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {theme.title}
            </div>
          </div>
          <div className="theme-count">
            {theme.count} supporting signal{theme.count !== 1 ? 's' : ''} &bull; {theme.percent}% of analyzed feedback
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 12 }}>
          <Badge variant={severityVariant}>
            {theme.severity || 'low'}
          </Badge>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-ghost btn-sm"
            title="Delete this insight"
            style={{ padding: 4, color: 'var(--color-text-tertiary)', opacity: deleting ? 0.5 : 1 }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Frequency bar */}
      <div className="theme-bar-track" style={{ margin: '8px 0 10px' }}>
        <div
          className="theme-bar-fill"
          style={{
            width: `${Math.max(5, Math.min(100, theme.percent || 0))}%`,
            background:
              theme.severity === 'critical' || theme.severity === 'high'
                ? 'var(--color-danger)'
                : theme.severity === 'medium'
                ? 'var(--color-warning)'
                : 'var(--color-accent)',
          }}
        />
      </div>

      {/* Sentiment breakdown indicators */}
      {theme.sentiment_breakdown && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          {theme.sentiment_breakdown.negative > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                fontWeight: 500,
              }}
            >
              {theme.sentiment_breakdown.negative} negative
            </span>
          )}
          {theme.sentiment_breakdown.neutral > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-subtle)',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              {theme.sentiment_breakdown.neutral} neutral
            </span>
          )}
          {theme.sentiment_breakdown.positive > 0 && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                fontWeight: 500,
              }}
            >
              {theme.sentiment_breakdown.positive} positive
            </span>
          )}
        </div>
      )}

      {/* Factual Description */}
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.55, marginBottom: 12 }}>
        {theme.description}
      </p>

      {/* Action Recommendation */}
      {theme.recommendation && (
        <div
          style={{
            background: 'var(--color-bg-subtle)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            fontSize: 12,
            color: 'var(--color-text)',
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>Recommendation: </span>
          {theme.recommendation}
        </div>
      )}

      {/* Quotes toggle */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <button
          id={`theme-quotes-${theme.id}`}
          className="btn btn-ghost btn-sm"
          onClick={() => setExpanded((x) => !x)}
          style={{ padding: '4px 0', color: 'var(--color-accent)', fontWeight: 500 }}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Hide supporting evidence' : `Show ${theme.quotes?.length || 0} supporting quote${theme.quotes?.length !== 1 ? 's' : ''}`}
        </button>

        {expanded && (
          <div className="quote-list" style={{ marginTop: 10 }}>
            {theme.quotes?.map((q) => (
              <div key={q.id} className="quote-item">
                <div style={{ marginBottom: 4 }}>"{q.text}"</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div className="quote-source">
                    — {q.source} &bull; <span style={{ fontFamily: 'monospace', fontSize: 11 }}>#{q.id.slice(0, 8)}</span>
                  </div>
                  {q.sentiment && <SentimentBadge sentiment={q.sentiment} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [bannerNotice, setBannerNotice] = useState(null);


  useEffect(() => {
    let active = true;
    api.getInsights()
      .then((res) => {
        if (active) {
          setInsights(res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Failed to load insights:', err);
          setError(err.message || 'Unable to connect to SignalDesk database.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      setBannerNotice(null);
      const res = await api.generateInsights();
      setInsights(res.data || []);
      setBannerNotice(res.message || 'Insights synchronized successfully.');
    } catch (err) {
      console.error('Failed to generate insights:', err);
      setError(err.message || 'Failed to generate insights from feedback.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInsight = (id) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    setBannerNotice('Insight deleted.');
  };

  const totalSignals = insights.reduce((sum, item) => sum + (item.count || 0), 0);
  const criticalCount = insights.filter((item) => item.severity === 'critical' || item.severity === 'high').length;

  return (
    <div className="page-content">
      {/* Top action header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>
            Evidence-Backed Insights
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Recurring customer themes synthesized deterministically from verified feedback records.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            id="btn-generate-insights"
            className="btn btn-primary btn-sm"
            onClick={handleGenerate}
            disabled={generating}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {generating ? (
              <>
                <RefreshCw size={13} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                Analyzing Signals...
              </>
            ) : (
              <>
                <Sparkles size={13} />
                Generate Insights
              </>
            )}
          </button>
        </div>
      </div>

      {/* Banner / Notices */}
      {error && (
        <div
          style={{
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            color: 'var(--color-danger)',
            marginBottom: 20,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {bannerNotice && !error && (
        <div
          style={{
            background: 'var(--color-info-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: 13,
            color: 'var(--color-info)',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lightbulb size={15} style={{ flexShrink: 0 }} />
            <span>{bannerNotice}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="btn btn-ghost btn-sm"
            style={{ padding: '2px 6px', fontSize: 12, color: 'inherit' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metric summary strip when insights exist */}
      {insights.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div className="stat-card" style={{ padding: '12px 16px' }}>
            <div className="stat-label">Identified Themes</div>
            <div className="stat-value" style={{ fontSize: 20, marginTop: 4 }}>{insights.length}</div>
          </div>
          <div className="stat-card" style={{ padding: '12px 16px' }}>
            <div className="stat-label">Evidence Signals Linked</div>
            <div className="stat-value" style={{ fontSize: 20, marginTop: 4 }}>{totalSignals}</div>
          </div>
          <div className="stat-card" style={{ padding: '12px 16px' }}>
            <div className="stat-label">High / Critical Urgency</div>
            <div className="stat-value" style={{ fontSize: 20, marginTop: 4, color: criticalCount > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
              {criticalCount}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <RefreshCw size={20} className="spin" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div>Loading evidence-backed insights...</div>
        </div>
      )}

      {/* Empty State */}
      {!loading && insights.length === 0 && (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--color-accent-light)',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Lightbulb size={22} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
            No insights generated yet
          </h3>
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-secondary)',
              maxWidth: 480,
              margin: '0 auto 20px',
              lineHeight: 1.6,
            }}
          >
            Insights cluster recurring customer themes and extract real evidence quotes from categorized feedback.
            Click below to analyze your existing signals or head to the Inbox to classify incoming feedback.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Sparkles size={14} />
              Generate Insights Now
            </button>
            <Link
              to="/inbox"
              className="btn btn-ghost btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--color-border)' }}
            >
              Go to Inbox
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      )}

      {/* Theme grid */}
      {!loading && insights.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
          {insights.map((theme) => (
            <ThemeCard key={theme.id} theme={theme} onDelete={handleDeleteInsight} />
          ))}
        </div>
      )}
    </div>
  );
}
