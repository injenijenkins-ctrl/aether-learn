-- Curriculum engine: Subject -> Module -> Lesson -> Concept hierarchy,
-- plus per-user progress and mastery tracking. This is the data model
-- the adaptive orchestrator (teach -> flashcards -> quiz -> advance)
-- runs against.
--
-- Naming note: prefixed with curriculum_ deliberately, since the schema
-- already has unrelated concepts that could otherwise collide —
-- course_books (a flat folder of a user's own resources), professor_courses
-- (lecturer-authored courses with approved materials), and lesson_history
-- (a flat log of past /learn queries). None of those are a structured,
-- progressable hierarchy; curriculum_* is new and separate from all three.
--
-- Convention match with the rest of this schema: TEXT primary keys
-- (generated with nanoid() in application code, not DB-generated),
-- user_id is a loose TEXT column with no FK and defaults to 'anonymous'
-- (same pattern as resources/notes/quiz_results/etc — supports
-- unauthenticated usage without a real users row), and RLS stays
-- disabled to match every other table (auth is enforced at the app
-- layer via getUserId(), as it is everywhere else in this schema — see
-- note at the bottom of this file on that tradeoff).

CREATE TABLE IF NOT EXISTS curriculum_subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Slug is how the hybrid curriculum model caches AI-generated subjects:
  -- the first learner of "quantum computing basics" pays the generation
  -- cost, everyone after reuses the same row by slug lookup instead of
  -- regenerating. Curated subjects get slugs assigned up front.
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'ai_generated'
    CHECK (source IN ('curated', 'ai_generated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curriculum_modules (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_id, order_index)
);

CREATE TABLE IF NOT EXISTS curriculum_lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES curriculum_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  -- Nullable + populated lazily: for curated subjects this may be
  -- pre-written; for ai_generated subjects it's filled in on first
  -- request by the orchestrator, then cached here for every learner
  -- after the first (same caching principle as the subject slug above).
  teaching_content TEXT,
  generated_at TIMESTAMPTZ,
  -- Loose optional link back to a source resource this lesson was
  -- grounded in via RAG, if any — useful for citation, not required.
  source_resource_id TEXT REFERENCES resources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module_id, order_index)
);

CREATE TABLE IF NOT EXISTS curriculum_concepts (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES curriculum_lessons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per user per subject: where they currently are in the journey.
CREATE TABLE IF NOT EXISTS user_subject_progress (
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  subject_id TEXT NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
  current_module_id TEXT REFERENCES curriculum_modules(id) ON DELETE SET NULL,
  current_lesson_id TEXT REFERENCES curriculum_lessons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject_id)
);

-- One row per user per concept: the "memory" the adaptive engine reads
-- to decide advance / reinforce / re-teach. Deliberately separate from
-- the existing flashcard_reviews table (which tracks per-card SM-2
-- state for the older, unstructured flashcard feature) — this is an
-- aggregate signal per curriculum concept, informed by quiz results and
-- flashcard performance together, not a 1:1 replacement for it.
CREATE TABLE IF NOT EXISTS user_concept_mastery (
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  concept_id TEXT NOT NULL REFERENCES curriculum_concepts(id) ON DELETE CASCADE,
  mastery_score INTEGER NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_due TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_modules_subject
  ON curriculum_modules(subject_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_lessons_module
  ON curriculum_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_concepts_lesson
  ON curriculum_concepts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_subject_progress_subject
  ON user_subject_progress(subject_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_concept
  ON user_concept_mastery(concept_id);
CREATE INDEX IF NOT EXISTS idx_user_concept_mastery_due
  ON user_concept_mastery(user_id, next_review_due);

ALTER TABLE curriculum_subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_concepts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_subject_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_concept_mastery DISABLE ROW LEVEL SECURITY;

-- NOTE ON RLS: every table in this schema has RLS disabled and relies
-- entirely on app-layer checks (getUserId() in lib/session.ts) rather
-- than Postgres row-level security. These six tables match that existing
-- pattern for consistency rather than introducing a one-off inconsistent
-- security model. Worth flagging explicitly though: this means a bug in
-- any single API route's auth check is a direct data leak across users,
-- with no database-level backstop, app-wide -- not something specific to
-- this migration. Fixing it properly would mean turning RLS on
-- everywhere at once with real Supabase auth policies, which is a
-- bigger, separate decision than this feature.
