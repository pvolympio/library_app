-- Local discovery catalog. API responses are materialized here so the app can
-- reopen every shelf offline and never has to refetch a snapshot implicitly.
CREATE TABLE IF NOT EXISTS catalog_books (
    catalog_id          TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    author              TEXT NOT NULL,
    isbn                TEXT,
    cover_url           TEXT NOT NULL,
    description         TEXT,
    average_rating      REAL,
    ratings_count       INTEGER,
    popularity_count    INTEGER,
    genre               TEXT NOT NULL,
    subjects_json       TEXT NOT NULL DEFAULT '[]',
    first_publish_year  INTEGER,
    open_library_key    TEXT,
    google_books_id     TEXT,
    hardcover_book_id   TEXT,
    source              TEXT NOT NULL,
    payload_json        TEXT NOT NULL,
    updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS catalog_snapshots (
    snapshot_key  TEXT PRIMARY KEY,
    source        TEXT NOT NULL,
    payload_json  TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_catalog_books_title ON catalog_books(title);
CREATE INDEX IF NOT EXISTS idx_catalog_books_genre ON catalog_books(genre);
CREATE INDEX IF NOT EXISTS idx_catalog_books_rating ON catalog_books(average_rating DESC);
