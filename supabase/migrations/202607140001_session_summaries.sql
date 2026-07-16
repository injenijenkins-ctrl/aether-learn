-- Session memory: a short AI-generated summary of what a user struggled
-- with / grasped quickly after each quiz attempt, NOT the full chat
-- transcript. Kept short and structured deliberately — feeding entire
-- conversation history into future prompts would balloon token costs
-- per interaction (this was flagged as a real risk during the tier
-- pricing discussion). A 2-4 sentence summary per session is orders of
-- magnitude cheaper to include as context than raw history, and is
-- capped at a handful of recent summaries per subject when read (see
-- lib/curriculum.ts getRecentSessionSummaries), not the full history.

CREATE TABLE IF NOT EXISTS user_session_summaries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  subject_id TEXT NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES curriculum_lessons(id) ON DELETE SET NULL,
  summary_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_session_summaries_lookup
  ON user_session_summaries(user_id, subject_id, created_at DESC);

ALTER TABLE user_session_summaries DISABLE ROW LEVEL SECURITY;
