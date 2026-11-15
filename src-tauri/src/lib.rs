use tauri_plugin_sql::{Migration, MigrationKind};

/// Migration inicial: cria books, reading_progress, highlights, notes.
/// O SQL vive em src/db/migrations/001_init.sql (fonte da verdade única,
/// compartilhada entre a documentação do schema e o backend).
const MIGRATION_001_INIT: &str = include_str!("../../src/db/migrations/001_init.sql");
const MIGRATION_002_READING_THEME_PREFERENCES: &str =
    include_str!("../../src/db/migrations/002_reading_theme_preferences.sql");
const MIGRATION_003_READING_ACTIVITY: &str =
    include_str!("../../src/db/migrations/003_reading_activity.sql");
const MIGRATION_004_BOOK_METADATA_CACHE: &str =
    include_str!("../../src/db/migrations/004_book_metadata_cache.sql");
const MIGRATION_005_CATALOG: &str =
    include_str!("../../src/db/migrations/005_catalog.sql");
const MIGRATION_006_USER_LIBRARY: &str =
    include_str!("../../src/db/migrations/006_user_library.sql");

fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_books_progress_highlights_notes",
            sql: MIGRATION_001_INIT,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_reading_theme_preferences",
            sql: MIGRATION_002_READING_THEME_PREFERENCES,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_reading_sessions_goals_completions",
            sql: MIGRATION_003_READING_ACTIVITY,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_book_metadata_cache",
            sql: MIGRATION_004_BOOK_METADATA_CACHE,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "create_local_discovery_catalog",
            sql: MIGRATION_005_CATALOG,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_user_library",
            sql: MIGRATION_006_USER_LIBRARY,
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                // Precisa bater com DB_URI em src/db/index.ts
                .add_migrations("sqlite:library.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("erro ao rodar a aplicacao Tauri");
}
