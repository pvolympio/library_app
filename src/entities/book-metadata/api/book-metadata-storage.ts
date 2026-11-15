import { getDb } from "@/db";
import type {
  BookMetadata,
  ManualMetadataField,
  MetadataMatch,
  MetadataStatus,
} from "../model/book-metadata";

interface MetadataRow {
  book_key: string;
  isbn: string | null;
  cover_url: string | null;
  description: string | null;
  average_rating: number | null;
  ratings_count: number | null;
  open_library_key: string | null;
  google_books_id: string | null;
  matched_by: MetadataMatch;
  status: MetadataStatus;
  manual_fields: string;
  attempted_at: string;
}

const browserCacheKey = "library-app:book-metadata-cache:v1";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function parseManualFields(value: string): ManualMetadataField[] {
  try {
    const fields = JSON.parse(value) as unknown;
    return Array.isArray(fields) ? fields.filter((field): field is ManualMetadataField =>
      ["title", "author", "cover", "description", "rating"].includes(String(field))) : [];
  } catch {
    return [];
  }
}

function mapRow(row: MetadataRow): BookMetadata {
  return {
    bookKey: row.book_key,
    isbn: row.isbn,
    coverUrl: row.cover_url,
    description: row.description,
    averageRating: row.average_rating == null ? null : Number(row.average_rating),
    ratingsCount: row.ratings_count == null ? null : Number(row.ratings_count),
    openLibraryKey: row.open_library_key,
    googleBooksId: row.google_books_id,
    matchedBy: row.matched_by,
    status: row.status,
    manualFields: parseManualFields(row.manual_fields),
    attemptedAt: row.attempted_at,
  };
}

function loadBrowserCache(): Record<string, BookMetadata> {
  try {
    return JSON.parse(window.localStorage.getItem(browserCacheKey) ?? "{}") as Record<string, BookMetadata>;
  } catch {
    return {};
  }
}

export async function loadCachedBookMetadata(bookKey: string): Promise<BookMetadata | null> {
  if (!isTauriRuntime()) return loadBrowserCache()[bookKey] ?? null;
  const db = await getDb();
  const rows = await db.select<MetadataRow[]>(
    "SELECT * FROM book_metadata_cache WHERE book_key = $1 LIMIT 1",
    [bookKey],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function saveCachedBookMetadata(metadata: BookMetadata): Promise<void> {
  if (!isTauriRuntime()) {
    const cache = loadBrowserCache();
    cache[metadata.bookKey] = metadata;
    window.localStorage.setItem(browserCacheKey, JSON.stringify(cache));
    return;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO book_metadata_cache (
       book_key, isbn, cover_url, description, average_rating, ratings_count,
       open_library_key, google_books_id, matched_by, status, manual_fields,
       attempted_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     ON CONFLICT(book_key) DO UPDATE SET
       isbn = excluded.isbn,
       cover_url = excluded.cover_url,
       description = excluded.description,
       average_rating = excluded.average_rating,
       ratings_count = excluded.ratings_count,
       open_library_key = excluded.open_library_key,
       google_books_id = excluded.google_books_id,
       matched_by = excluded.matched_by,
       status = excluded.status,
       manual_fields = excluded.manual_fields,
       attempted_at = excluded.attempted_at,
       updated_at = excluded.updated_at`,
    [
      metadata.bookKey,
      metadata.isbn,
      metadata.coverUrl,
      metadata.description,
      metadata.averageRating,
      metadata.ratingsCount,
      metadata.openLibraryKey,
      metadata.googleBooksId,
      metadata.matchedBy,
      metadata.status,
      JSON.stringify(metadata.manualFields),
      metadata.attemptedAt,
    ],
  );
}
