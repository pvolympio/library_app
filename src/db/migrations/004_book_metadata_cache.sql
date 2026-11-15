-- One row means an automatic lookup was already attempted for the book.
-- Incomplete and failed results are cached too, preventing automatic refetches.
CREATE TABLE IF NOT EXISTS book_metadata_cache (
    book_key          TEXT PRIMARY KEY,
    isbn              TEXT,
    cover_url         TEXT,
    description       TEXT,
    average_rating    REAL,
    ratings_count     INTEGER,
    open_library_key  TEXT,
    google_books_id   TEXT,
    matched_by        TEXT NOT NULL DEFAULT 'none'
                           CHECK (matched_by IN ('isbn', 'title-author', 'none')),
    status            TEXT NOT NULL DEFAULT 'incomplete'
                           CHECK (status IN ('complete', 'incomplete')),
    manual_fields     TEXT NOT NULL DEFAULT '[]',
    attempted_at      TEXT NOT NULL,
    updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_book_metadata_cache_isbn
    ON book_metadata_cache(isbn);
