CREATE TABLE IF NOT EXISTS user_library (
    catalog_id      TEXT PRIMARY KEY,
    status          TEXT NOT NULL DEFAULT 'want-to-read',
    is_favorite     INTEGER NOT NULL DEFAULT 0,
    personal_rating REAL,
    progress        REAL NOT NULL DEFAULT 0,
    payload_json    TEXT NOT NULL,
    added_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_user_library_status ON user_library(status);
CREATE INDEX IF NOT EXISTS idx_user_library_updated ON user_library(updated_at DESC);
