-- Run in Supabase SQL Editor: ALTER TABLE users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT FALSE;
-- Run once in Supabase SQL Editor (Dashboard → SQL → New query)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
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

CREATE INDEX IF NOT EXISTS idx_resources_user ON resources(user_id);
CREATE INDEX IF NOT EXISTS idx_course_books_user ON course_books(user_id);
CREATE INDEX IF NOT EXISTS idx_course_book_resources_book ON course_book_resources(course_book_id);
CREATE INDEX IF NOT EXISTS idx_course_book_resources_resource ON course_book_resources(resource_id);
CREATE INDEX IF NOT EXISTS idx_chunks_resource ON chunks(resource_id);
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

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_books DISABLE ROW LEVEL SECURITY;
ALTER TABLE course_book_resources DISABLE ROW LEVEL SECURITY;
ALTER TABLE chunks DISABLE ROW LEVEL SECURITY;
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
