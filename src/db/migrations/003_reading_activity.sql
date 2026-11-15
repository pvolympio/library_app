-- Migration 003: sessoes de leitura, metas e conclusoes anuais.
-- Destaques e notas reutilizam as tabelas criadas na migration 001.

CREATE TABLE IF NOT EXISTS reading_sessions (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id           INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    started_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ended_at          TEXT,
    duration_seconds  INTEGER NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
    pages_read        INTEGER NOT NULL DEFAULT 0 CHECK (pages_read >= 0)
);

CREATE TABLE IF NOT EXISTS reading_goals (
    year          INTEGER PRIMARY KEY,
    target_books  INTEGER NOT NULL DEFAULT 12 CHECK (target_books > 0),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS book_completions (
    book_id       INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    year          INTEGER NOT NULL,
    completed_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    PRIMARY KEY (book_id, year)
);

CREATE INDEX IF NOT EXISTS idx_reading_sessions_book_started
    ON reading_sessions(book_id, started_at);
CREATE INDEX IF NOT EXISTS idx_reading_sessions_started
    ON reading_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_book_completions_year
    ON book_completions(year, completed_at);
