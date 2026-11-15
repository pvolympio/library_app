import { getDb } from "@/db";
import type { BookshelfBook } from "@/types/bookshelf";
import type { LibraryEntry, LibraryStatus } from "../model/library";

const STORAGE_KEY = "library-app:user-library:v2";

interface LibraryRow {
  catalog_id: string;
  status: LibraryStatus;
  is_favorite: number;
  personal_rating: number | null;
  progress: number;
  payload_json: string;
  added_at: string;
  updated_at: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function loadBrowser(): LibraryEntry[] {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as LibraryEntry[];
  } catch {
    return [];
  }
}

function saveBrowser(entries: LibraryEntry[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function mapRow(row: LibraryRow): LibraryEntry {
  return {
    book: JSON.parse(row.payload_json) as BookshelfBook,
    status: row.status,
    favorite: Boolean(row.is_favorite),
    personalRating: row.personal_rating,
    progress: Number(row.progress),
    addedAt: row.added_at,
    updatedAt: row.updated_at,
  };
}

export async function loadLibraryEntries(): Promise<LibraryEntry[]> {
  if (!isTauri()) return loadBrowser();
  const db = await getDb();
  const rows = await db.select<LibraryRow[]>("SELECT * FROM user_library ORDER BY updated_at DESC");
  return rows.map(mapRow);
}

export async function saveLibraryEntry(entry: LibraryEntry): Promise<void> {
  if (!isTauri()) {
    const entries = loadBrowser();
    const next = [entry, ...entries.filter((item) => item.book.id !== entry.book.id)];
    saveBrowser(next);
    return;
  }
  const db = await getDb();
  await db.execute(
    `INSERT INTO user_library (catalog_id, status, is_favorite, personal_rating, progress, payload_json, added_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT(catalog_id) DO UPDATE SET status=excluded.status,
       is_favorite=excluded.is_favorite, personal_rating=excluded.personal_rating,
       progress=excluded.progress, payload_json=excluded.payload_json,
       updated_at=excluded.updated_at`,
    [entry.book.id, entry.status, entry.favorite ? 1 : 0, entry.personalRating,
      entry.progress, JSON.stringify(entry.book), entry.addedAt, entry.updatedAt],
  );
}

export async function deleteLibraryEntry(bookId: string): Promise<void> {
  if (!isTauri()) {
    saveBrowser(loadBrowser().filter((entry) => entry.book.id !== bookId));
    return;
  }
  const db = await getDb();
  await db.execute("DELETE FROM user_library WHERE catalog_id = $1", [bookId]);
}
