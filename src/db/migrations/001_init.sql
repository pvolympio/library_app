-- Migration 001: schema inicial
-- Tabelas: books, reading_progress, highlights, notes

CREATE TABLE IF NOT EXISTS books (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    author      TEXT,
    theme_id    TEXT,
    file_path   TEXT,
    cover_path  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reading_progress (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    location    TEXT    NOT NULL,
    percentage  REAL    NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 1),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS highlights (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    location    TEXT    NOT NULL,
    content     TEXT    NOT NULL,
    color       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id       INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    highlight_id  INTEGER REFERENCES highlights(id) ON DELETE SET NULL,
    location      TEXT,
    content       TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_book_id ON reading_progress(book_id);
CREATE INDEX IF NOT EXISTS idx_highlights_book_id ON highlights(book_id);
CREATE INDEX IF NOT EXISTS idx_notes_book_id ON notes(book_id);
