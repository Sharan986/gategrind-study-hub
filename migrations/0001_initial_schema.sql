-- ====================================================================
-- GATE Grind - Cloudflare D1 Relational Schema (Version 1.0)
-- Target: Cloudflare D1 (SQLite)
-- Reproducible via `wrangler d1 migrations apply <DB_NAME>`
-- ====================================================================

-- 1. USER PROFILES
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    google_sub TEXT UNIQUE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'contributor', 'admin')),
    target_gate_year INTEGER DEFAULT 2026,
    daily_goal_questions INTEGER DEFAULT 15,
    streak_days INTEGER DEFAULT 0,
    last_active_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON user_profiles(google_sub);

-- 2. USER SESSIONS (Fast Edge Session Store)
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    user_agent TEXT,
    ip_address TEXT,
    expires_at INTEGER NOT NULL, -- Unix timestamp in seconds
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);

-- 3. SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    code TEXT,
    description TEXT,
    icon TEXT,
    weightage_marks REAL DEFAULT 0.0,
    total_questions INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subjects_slug ON subjects(slug);

-- 4. TOPICS
CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    chapter_number INTEGER,
    key_concepts_markdown TEXT,
    total_questions INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(subject_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_slug ON topics(slug);

-- 5. QUESTIONS (Canonical GATE CSE & Aptitude Question Bank)
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    external_code TEXT NOT NULL UNIQUE, -- e.g. "vol1-1.1.1", "vol2-1.46.1"
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
    gate_year INTEGER,
    gate_set TEXT,                      -- 'Set 1', 'Set 2', 'DA', null
    gate_question_number TEXT,
    question_type TEXT NOT NULL DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'MSQ', 'NAT', 'DESCRIPTIVE')),
    marks REAL NOT NULL DEFAULT 1.0,
    difficulty TEXT DEFAULT 'normal' CHECK (difficulty IN ('easy', 'normal', 'hard')),
    question_html TEXT NOT NULL,
    options TEXT,                       -- JSON string: {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_answer TEXT NOT NULL,       -- "A", "A;C", "195:195", "X", "N/A"
    is_mta INTEGER NOT NULL DEFAULT 0,  -- 1 if Marks to All (cancelled), 0 otherwise
    answer_verified INTEGER NOT NULL DEFAULT 1,
    explanation_html TEXT,
    tags TEXT,                          -- Comma-separated or JSON array string
    has_image INTEGER NOT NULL DEFAULT 0,
    source_volume TEXT NOT NULL,        -- 'filter1_volume1.pdf'
    source_page INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(gate_year);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_ext_code ON questions(external_code);

-- 6. QUESTION ATTEMPTS (Strict User Isolation)
CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_answer TEXT NOT NULL,
    is_correct INTEGER NOT NULL,        -- 1 = true, 0 = false
    time_taken_seconds INTEGER NOT NULL DEFAULT 0,
    mode TEXT NOT NULL DEFAULT 'study' CHECK (mode IN ('study', 'mock', 'paper')),
    mock_id TEXT,
    attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_question ON attempts(user_id, question_id);

-- 7. BOOKMARKS
CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);

-- 8. SYLLABUS PROGRESS TRACKING
CREATE TABLE IF NOT EXISTS syllabus_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    notes TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_syllabus_user ON syllabus_progress(user_id);

-- 9. QUESTION LISTS (User Collections)
CREATE TABLE IF NOT EXISTS question_lists (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_public INTEGER NOT NULL DEFAULT 0,
    question_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of question IDs
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lists_user ON question_lists(user_id);

-- 10. MOCK EXAMS & SESSIONS
CREATE TABLE IF NOT EXISTS mocks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    config TEXT NOT NULL,               -- JSON: { duration_minutes: 180, subjects: [...], total_marks: 100 }
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'in_progress', 'completed')),
    score REAL,
    total_marks REAL NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mocks_user ON mocks(user_id);

-- 11. EDGE RATE LIMITING & PROTECTION
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    counter INTEGER DEFAULT 1,
    reset_at INTEGER NOT NULL
);

