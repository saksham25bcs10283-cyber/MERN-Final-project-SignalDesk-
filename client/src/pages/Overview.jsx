import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import { METRICS, TOP_ISSUES } from '../data/demo';
import { PriorityDot, StatusBadge } from '../components/ui';

// ── Stat card ────────────────────────────────────────────────────
function StatCard({ label, value, delta, direction, note }) {
  const DeltaIcon =
    direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const deltaClass =
    direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'neutral';

  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-delta ${deltaClass}`}>
        <DeltaIcon size={12} />
        {delta}
        <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400, marginLeft: 2 }}>
          {note}
        </span>
      </div>
    </div>
  );
}

// ── Issue summary row ─────────────────────────────────────────────
function IssueRow({ issue }) {
  const TrendIcon =
    issue.trend === 'up' ? TrendingUp : issue.trend === 'down' ? TrendingDown : Minus;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--color-border)' }}>
      <PriorityDot level={issue.priority} />
      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--color-text)' }}>{issue.title}</span>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', width: 60, textAlign: 'right' }}>
        {issue.count} signals
      </span>
      <TrendIcon
        size={13}
        style={{
          color:
            issue.trend === 'up'
              ? 'var(--color-danger)'
              : issue.trend === 'down'
              ? 'var(--color-success)'
              : 'var(--color-text-tertiary)',
        }}
      />
    </div>
  );
}

// ── Sentiment summary donut-style bar ────────────────────────────
function SentimentSummary() {
  // [positive, neutral, negative] percentages
  const data = [28, 34, 38];
  return (
    <div>
      <div className="sentiment-bar" style={{ marginBottom: 10 }}>
        <div className="sentiment-pos" style={{ flex: data[0] }} />
        <div className="sentiment-neu" style={{ flex: data[1] }} />
        <div className="sentiment-neg" style={{ flex: data[2] }} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { label: 'Positive', val: `${data[0]}%`, cls: 'var(--color-success)' },
          { label: 'Neutral',  val: `${data[1]}%`, cls: 'var(--color-text-tertiary)' },
          { label: 'Negative', val: `${data[2]}%`, cls: 'var(--color-danger)' },
        ].map((s) => (
          <div key={s.label} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
            <span style={{ color: s.cls, fontWeight: 600 }}>{s.val}</span>{' '}
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Source breakdown ──────────────────────────────────────────────
const SOURCES = [
  { name: 'Intercom', count: 812, pct: 44 },
  { name: 'Email',    count: 554, pct: 30 },
  { name: 'Slack',    count: 331, pct: 18 },
  { name: 'Other',    count: 145, pct: 8 },
];

function SourceBreakdown() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {SOURCES.map((s) => (
        <div key={s.name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{s.name}</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{s.count}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${s.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function Overview() {
  return (
    <div className="page-content">
      {/* Stat cards */}
      <div className="stat-grid">
        {METRICS.map((m) => (
          <StatCard key={m.label} {...m} />
        ))}
      </div>

      {/* Top issues + Sentiment */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        {/* Top issues */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Top Issues</div>
              <div className="card-subtitle">Ranked by signal volume · last 30 days</div>
            </div>
            <a href="/inbox" style={{ fontSize: 12, color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: 3 }}>
              View all <ArrowUpRight size={12} />
            </a>
          </div>
          {TOP_ISSUES.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>

        {/* Right column */}
        <div className="gap-y-4" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Sentiment */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Sentiment Distribution</div>
              <div className="card-subtitle">Oct 2026</div>
            </div>
            <div className="card-body">
              <SentimentSummary />
            </div>
          </div>

          {/* Source breakdown */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Feedback by Source</div>
              <div className="card-subtitle">All time</div>
            </div>
            <div className="card-body">
              <SourceBreakdown />
            </div>
          </div>
        </div>
      </div>

      {/* Recent activity notice */}
      <div
        style={{
          background: 'var(--color-accent-light)',
          border: '1px solid #c7d0f8',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontSize: 13,
          color: 'var(--color-accent)',
        }}
      >
        <TrendingUp size={14} />
        <strong>3 new high-priority signals</strong>&nbsp;were detected in the last 24 h.&nbsp;
        <a href="/insights" style={{ fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 2 }}>
          View AI Insights →
        </a>
      </div>
    </div>
  );
}
