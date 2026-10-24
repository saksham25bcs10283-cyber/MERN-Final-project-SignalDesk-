/**
 * Reusable Badge / Status chip.
 * variant: 'success' | 'warning' | 'danger' | 'info' | 'default'
 */
export function Badge({ children, variant = 'default' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}

/**
 * Priority dot indicator.
 * level: 'high' | 'medium' | 'low'
 */
export function PriorityDot({ level }) {
  return <span className={`priority-dot ${level}`} title={`Priority: ${level}`} />;
}

/**
 * Sentiment badge — maps sentiment string to a variant.
 */
const SENTIMENT_VARIANT = {
  positive: 'success',
  neutral:  'default',
  negative: 'danger',
};
export function SentimentBadge({ sentiment }) {
  return <Badge variant={SENTIMENT_VARIANT[sentiment] ?? 'default'}>{sentiment}</Badge>;
}

/**
 * Status badge — maps status string to a variant.
 */
const STATUS_VARIANT = {
  open:       'danger',
  triaged:    'warning',
  'in-review':'info',
  resolved:   'success',
  todo:       'default',
  'in-progress': 'info',
  done:       'success',
  backlog:    'default',
};
export function StatusBadge({ status }) {
  const label = status.replace(/-/g, ' ');
  return <Badge variant={STATUS_VARIANT[status] ?? 'default'}>{label}</Badge>;
}

/**
 * Simple card wrapper.
 */
export function Card({ children, style }) {
  return <div className="card" style={style}>{children}</div>;
}
