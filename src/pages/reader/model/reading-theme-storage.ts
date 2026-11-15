import { getDb } from "@/db";
import type { ReaderBook } from "./reader-preferences";
import {
  ensureReadingBook as ensureReaderBook,
  isTauriRuntime,
} from "@/entities/reading-activity";
import {
  DEFAULT_READING_THEME_SETTINGS,
  READING_THEME_PRESETS,
  type ReadingPresetId,
  type ReadingThemeSettings,
} from "./reading-themes";

interface ReadingThemeRow {
  automatic_by_genre: number;
  preset_id: string;
}

const browserStoragePrefix = "library-app:reading-theme:";
const writeQueues = new Map<string, Promise<void>>();

function storageKey(book: ReaderBook): string {
  return `${browserStoragePrefix}${book.storageKey}`;
}

function isPresetId(value: string): value is ReadingPresetId {
  return READING_THEME_PRESETS.some((preset) => preset.id === value);
}

function normalizeSettings(value: Partial<ReadingThemeSettings>): ReadingThemeSettings {
  return {
    automaticByGenre:
      typeof value.automaticByGenre === "boolean"
        ? value.automaticByGenre
        : DEFAULT_READING_THEME_SETTINGS.automaticByGenre,
    manualPresetId:
      typeof value.manualPresetId === "string" && isPresetId(value.manualPresetId)
        ? value.manualPresetId
        : DEFAULT_READING_THEME_SETTINGS.manualPresetId,
  };
}

function loadBrowserSettings(book: ReaderBook): ReadingThemeSettings | null {
  try {
    const stored = window.localStorage.getItem(storageKey(book));
    return stored ? normalizeSettings(JSON.parse(stored) as Partial<ReadingThemeSettings>) : null;
  } catch {
    return null;
  }
}

function saveBrowserSettings(book: ReaderBook, settings: ReadingThemeSettings) {
  try {
    window.localStorage.setItem(storageKey(book), JSON.stringify(settings));
  } catch {
    // O modo de leitura continua funcional sem persistência no preview web.
  }
}

export async function loadReadingThemeSettings(
  book: ReaderBook,
): Promise<ReadingThemeSettings | null> {
  if (!isTauriRuntime()) return loadBrowserSettings(book);

  const db = await getDb();
  const bookId = await ensureReaderBook(book);
  const rows = await db.select<ReadingThemeRow[]>(
    `SELECT automatic_by_genre, preset_id
       FROM reading_theme_preferences
      WHERE book_id = $1
      LIMIT 1`,
    [bookId],
  );

  const row = rows[0];
  if (!row) return null;

  return normalizeSettings({
    automaticByGenre: row.automatic_by_genre === 1,
    manualPresetId: row.preset_id as ReadingPresetId,
  });
}

async function persistToSqlite(book: ReaderBook, settings: ReadingThemeSettings) {
  const db = await getDb();
  const bookId = await ensureReaderBook(book);
  await db.execute(
    `INSERT INTO reading_theme_preferences (book_id, automatic_by_genre, preset_id)
     VALUES ($1, $2, $3)
     ON CONFLICT(book_id) DO UPDATE SET
       automatic_by_genre = excluded.automatic_by_genre,
       preset_id = excluded.preset_id,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    [bookId, settings.automaticByGenre ? 1 : 0, settings.manualPresetId],
  );
}

export function saveReadingThemeSettings(
  book: ReaderBook,
  settings: ReadingThemeSettings,
) {
  if (!isTauriRuntime()) {
    saveBrowserSettings(book, settings);
    return;
  }

  const previous = writeQueues.get(book.storageKey) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => persistToSqlite(book, settings))
    .catch((error: unknown) => {
      console.error("Falha ao salvar o tema de leitura:", error);
    });

  writeQueues.set(book.storageKey, next);
}
