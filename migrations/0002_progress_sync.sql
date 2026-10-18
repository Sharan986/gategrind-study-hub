-- GATE Grind: per-user progress sync (attempts, history, mocks, bookmarks, syllabus, planner)
-- Rows are keyed by (user_id, kind, item_key); newest updated_at wins on conflict.
CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('attempt', 'history', 'mock', 'bookmarks', 'syllabus', 'planner')),
    item_key TEXT NOT NULL,
    payload TEXT NOT NULL,          -- JSON
    updated_at INTEGER NOT NULL,    -- epoch milliseconds
    PRIMARY KEY (user_id, kind, item_key)
);

CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_progress(user_id, kind);
