-- SignalDesk Database Migration
-- Version: 002_add_classification_fields.sql
-- Description: Add classified_at column and index to track AI classification status

ALTER TABLE feedback
ADD COLUMN IF NOT EXISTS classified_at TIMESTAMPTZ;

-- Index for filtering classified vs unclassified feedback
CREATE INDEX IF NOT EXISTS idx_feedback_classified_at ON feedback(classified_at);
