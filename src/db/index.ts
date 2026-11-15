import Database from "@tauri-apps/plugin-sql";

/**
 * Nome/URI do banco SQLite. Precisa bater com o registrado nas migrations
 * do plugin em src-tauri/src/lib.rs (`.add_migrations("sqlite:library.db", ...)`).
 * O tauri-plugin-sql resolve o caminho físico do arquivo automaticamente
 * dentro do diretório de dados do app.
 */
export const DB_URI = "sqlite:library.db";

let dbPromise: Promise<Database> | null = null;

/**
 * Retorna (e memoiza) a conexão com o banco local.
 * As migrations definidas no lado Rust rodam automaticamente no load().
 */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URI);
  }
  return dbPromise;
}
