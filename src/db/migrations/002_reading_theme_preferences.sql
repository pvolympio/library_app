-- Migration 002: preferências de tema do modo de leitura por livro.
-- Esta camada é independente de books.theme_id, que representa o tema da biblioteca.

CREATE TABLE IF NOT EXISTS reading_theme_preferences (
    book_id              INTEGER PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
    automatic_by_genre   INTEGER NOT NULL DEFAULT 1 CHECK (automatic_by_genre IN (0, 1)),
    preset_id            TEXT    NOT NULL DEFAULT 'fantasy'
                                 CHECK (preset_id IN (
                                     'fantasy',
                                     'science-fiction',
                                     'horror',
                                     'romance',
                                     'nonfiction',
                                     'children'
                                 )),
    updated_at           TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
