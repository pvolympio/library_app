import { getDb } from "@/db";
import type { ReaderBook } from "./reader-preferences";
import {
  ensureReadingBook as ensureReaderBook,
  isTauriRuntime,
} from "@/entities/reading-activity";

export interface SavedReadingProgress {
  location: string;
  percentage: number;
}

interface ProgressRow {
  id: number;
  location: string;
  percentage: number;
}

const browserStoragePrefix = "library-app:reading-progress:";
const writeQueues = new Map<string, Promise<void>>();

function browserStorageKey(book: ReaderBook): string {
  return `${browserStoragePrefix}${book.storageKey}`;
}

function loadBrowserProgress(book: ReaderBook): SavedReadingProgress | null {
  try {
    const value = window.localStorage.getItem(browserStorageKey(book));
    if (!value) return null;

    const parsed = JSON.parse(value) as SavedReadingProgress;
    if (typeof parsed.location !== "string" || typeof parsed.percentage !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveBrowserProgress(book: ReaderBook, progress: SavedReadingProgress) {
  try {
    window.localStorage.setItem(browserStorageKey(book), JSON.stringify(progress));
  } catch {
    // A leitura continua mesmo se o armazenamento do navegador estiver indisponível.
  }
}

export async function loadReadingProgress(
  book: ReaderBook,
): Promise<SavedReadingProgress | null> {
  if (!isTauriRuntime()) return loadBrowserProgress(book);

  const db = await getDb();
  const bookId = await ensureReaderBook(book);
  const rows = await db.select<ProgressRow[]>(
    `SELECT id, location, percentage
       FROM reading_progress
      WHERE book_id = $1
      ORDER BY updated_at DESC, id DESC
      LIMIT 1`,
    [bookId],
  );

  const row = rows[0];
  return row ? { location: row.location, percentage: row.percentage } : null;
}

async function persistToSqlite(book: ReaderBook, progress: SavedReadingProgress) {
  const db = await getDb();
  const bookId = await ensureReaderBook(book);
  const existing = await db.select<ProgressRow[]>(
    `SELECT id, location, percentage
       FROM reading_progress
      WHERE book_id = $1
      ORDER BY updated_at DESC, id DESC
      LIMIT 1`,
    [bookId],
  );

  if (existing[0]) {
    await db.execute(
      `UPDATE reading_progress
          SET location = $1,
              percentage = $2,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = $3`,
      [progress.location, progress.percentage, existing[0].id],
    );
    return;
  }

  await db.execute(
    "INSERT INTO reading_progress (book_id, location, percentage) VALUES ($1, $2, $3)",
    [bookId, progress.location, progress.percentage],
  );
}

export function saveReadingProgress(book: ReaderBook, progress: SavedReadingProgress) {
  if (!isTauriRuntime()) {
    saveBrowserProgress(book, progress);
    return;
  }

  const previous = writeQueues.get(book.storageKey) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => persistToSqlite(book, progress))
    .catch((error: unknown) => {
      console.error("Falha ao salvar o progresso de leitura:", error);
    });

  writeQueues.set(book.storageKey, next);
}
