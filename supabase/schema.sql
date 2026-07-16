-- Run in Supabase SQL Editor: ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE;
-- Run once in Supabase SQL Editor (Dashboard → SQL → New query)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  ai_tier TEXT NOT NULL DEFAULT 'free' CHECK (ai_tier IN ('free', 'basic', 'plus', 'pro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT 'violet',
  goal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_book_resources (
  id TEXT PRIMARY KEY,
  course_book_id TEXT NOT NULL REFERENCES course_books(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_book_id, resource_id)
);

CREATE TABLE IF NOT EXISTS chunks (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  text TEXT NOT NULL,
  embedding JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS embeddings (
  id TEXT PRIMARY KEY,
  content_chunk TEXT NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  source_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  topic TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_questions_answered (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta JSONB
);

CREATE TABLE IF NOT EXISTS lesson_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL,
  query TEXT NOT NULL,
  depth TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  daily_minutes INTEGER NOT NULL,
  target_topics TEXT NOT NULL,
  study_goal TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  card_id TEXT NOT NULL,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review TIMESTAMPTZ NOT NULL,
  last_review TIMESTAMPTZ,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professor_courses (
  id TEXT PRIMARY KEY,
  lecturer_id TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  institution TEXT,
  description TEXT,
  pricing_model TEXT NOT NULL DEFAULT 'per_course',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professor_course_materials (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES professor_courses(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  lecturer_id TEXT NOT NULL DEFAULT 'anonymous',
  material_type TEXT NOT NULL DEFAULT 'approved_material',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, resource_id)
);

CREATE TABLE IF NOT EXISTS professor_course_enrollments (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES professor_courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL DEFAULT 'anonymous',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, student_id)
);

CREATE TABLE IF NOT EXISTS professor_course_questions (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES professor_courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL DEFAULT 'anonymous',
  question TEXT NOT NULL,
  topic TEXT,
  misconception TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS past_paper_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  exam_type TEXT NOT NULL,
  title TEXT NOT NULL,
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS past_paper_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  analysis_id TEXT NOT NULL REFERENCES past_paper_analyses(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL,
  correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_countdowns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  exam_name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  daily_minutes INTEGER NOT NULL,
  topics TEXT NOT NULL,
  reminder_channel TEXT NOT NULL DEFAULT 'browser',
  reminder_time TEXT NOT NULL DEFAULT '18:00',
  schedule_json JSONB NOT NULL,
  completed_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_counters (
  user_id TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  interactions_used INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'free',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, period_start),
  CHECK (interactions_used >= 0),
  CHECK (tier IN ('free', 'basic', 'plus', 'pro')),
  CHECK (period_end > period_start)
);

CREATE TABLE IF NOT EXISTS ip_rate_limit_events (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_user ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_course_books_user ON course_books(user_id);
CREATE INDEX IF NOT EXISTS idx_course_book_resources_book ON course_book_resources(course_book_id);
CREATE INDEX IF NOT EXISTS idx_course_book_resources_resource ON course_book_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_chunks_resource ON chunks(resource_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON embeddings((metadata->>'user_id'));
CREATE INDEX IF NOT EXISTS idx_embeddings_embedding_hnsw
  ON embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user ON flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_next ON flashcard_reviews(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_professor_courses_lecturer ON professor_courses(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_professor_course_materials_course ON professor_course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_professor_course_enrollments_student ON professor_course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_professor_course_questions_course ON professor_course_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_past_paper_analyses_user ON past_paper_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_past_paper_attempts_user ON past_paper_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_countdowns_user ON exam_countdowns(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_counters_period ON usage_counters(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_ip_rate_limit_events_hash_created
  ON ip_rate_limit_events(ip_hash, created_at DESC);

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_books DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_book_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions_answered DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE professor_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE professor_course_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE professor_course_enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE professor_course_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE past_paper_attempts DISABLE ROW LEVEL SECURITY;
ALTER TABLE exam_countdowns DISABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters DISABLE ROW LEVEL SECURITY;
ALTER TABLE ip_rate_limit_events DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding VECTOR(1536),
  match_count INTEGER DEFAULT 5,
  filter_user_id TEXT DEFAULT NULL,
  filter_source_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  content_chunk TEXT,
  embedding TEXT,
  source_id TEXT,
  metadata JSONB,
  resource_title TEXT,
  resource_type TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    e.id,
    e.content_chunk,
    e.embedding::text AS embedding,
    e.source_id,
    e.metadata,
    r.title AS resource_title,
    r.type AS resource_type,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM embeddings e
  LEFT JOIN resources r ON r.id = e.source_id
  WHERE
    (filter_user_id IS NULL OR COALESCE(e.metadata->>'user_id', r.user_id) = filter_user_id)
    AND (filter_source_ids IS NULL OR e.source_id = ANY(filter_source_ids))
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION consume_ai_interaction(
  counter_user_id TEXT,
  counter_tier TEXT,
  counter_period_start TIMESTAMPTZ,
  counter_period_end TIMESTAMPTZ,
  tier_cap INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  interactions_used INTEGER,
  remaining INTEGER,
  tier TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
  updated_row usage_counters%ROWTYPE;
  current_row usage_counters%ROWTYPE;
BEGIN
  INSERT INTO usage_counters (
    user_id,
    period_start,
    period_end,
    interactions_used,
    tier,
    updated_at
  )
  VALUES (
    counter_user_id,
    counter_period_start,
    counter_period_end,
    0,
    counter_tier,
    NOW()
  )
  ON CONFLICT (user_id, period_start) DO NOTHING;

  UPDATE usage_counters
  SET
    interactions_used = interactions_used + 1,
    tier = counter_tier,
    period_end = counter_period_end,
    updated_at = NOW()
  WHERE user_id = counter_user_id
    AND period_start = counter_period_start
    AND interactions_used < tier_cap
  RETURNING * INTO updated_row;

  IF FOUND THEN
    RETURN QUERY SELECT
      TRUE,
      updated_row.interactions_used,
      GREATEST(tier_cap - updated_row.interactions_used, 0),
      updated_row.tier,
      updated_row.period_start,
      updated_row.period_end;
    RETURN;
  END IF;

  SELECT *
  INTO current_row
  FROM usage_counters
  WHERE user_id = counter_user_id
    AND period_start = counter_period_start;

  RETURN QUERY SELECT
    FALSE,
    COALESCE(current_row.interactions_used, tier_cap),
    0,
    COALESCE(current_row.tier, counter_tier),
    COALESCE(current_row.period_start, counter_period_start),
    COALESCE(current_row.period_end, counter_period_end);
END;
$$;

CREATE OR REPLACE FUNCTION consume_ip_rate_limit(
  ip_hash TEXT,
  max_requests INTEGER,
  window_seconds INTEGER
)
RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('ip-rate-limit:' || ip_hash));

  DELETE FROM ip_rate_limit_events
  WHERE created_at < NOW() - (window_seconds || ' seconds')::INTERVAL;

  SELECT COUNT(*)::INTEGER
  INTO current_count
  FROM ip_rate_limit_events
  WHERE ip_rate_limit_events.ip_hash = consume_ip_rate_limit.ip_hash
    AND created_at >= NOW() - (window_seconds || ' seconds')::INTERVAL;

  IF current_count >= max_requests THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  INSERT INTO ip_rate_limit_events (ip_hash)
  VALUES (ip_hash);

  RETURN QUERY SELECT TRUE, GREATEST(max_requests - current_count - 1, 0);
END;
$$;
