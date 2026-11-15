import { getDb } from "@/db";
import type { BookshelfBook } from "@/types/bookshelf";
import type { CatalogSnapshot } from "../model/catalog";

const browserCacheKey = "library-app:catalog-snapshots:v1";

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function loadBrowserSnapshots(): Record<string, CatalogSnapshot> {
  try {
    return JSON.parse(window.localStorage.getItem(browserCacheKey) ?? "{}") as Record<string, CatalogSnapshot>;
  } catch {
    return {};
  }
}

function flattenBooks(snapshot: CatalogSnapshot): BookshelfBook[] {
  const unique = new Map<string, BookshelfBook>();
  for (const shelf of snapshot.shelves) {
    for (const book of shelf.books) unique.set(book.id, book);
  }
  return [...unique.values()];
}

export async function loadCatalogSnapshot(key: string): Promise<CatalogSnapshot | null> {
  if (!isTauriRuntime()) return loadBrowserSnapshots()[key] ?? null;
  const db = await getDb();
  const rows = await db.select<Array<{ payload_json: string }>>(
    "SELECT payload_json FROM catalog_snapshots WHERE snapshot_key = $1 LIMIT 1",
    [key],
  );
  if (!rows[0]) return null;
  try {
    return JSON.parse(rows[0].payload_json) as CatalogSnapshot;
  } catch {
    return null;
  }
}

export async function saveCatalogSnapshot(snapshot: CatalogSnapshot): Promise<void> {
  if (!isTauriRuntime()) {
    const snapshots = loadBrowserSnapshots();
    snapshots[snapshot.key] = snapshot;
    window.localStorage.setItem(browserCacheKey, JSON.stringify(snapshots));
    return;
  }

  const db = await getDb();
  await db.execute(
    `INSERT INTO catalog_snapshots (snapshot_key, source, payload_json, created_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(snapshot_key) DO UPDATE SET
       source = excluded.source,
       payload_json = excluded.payload_json,
       created_at = excluded.created_at`,
    [snapshot.key, snapshot.source, JSON.stringify(snapshot), snapshot.createdAt],
  );

  for (const book of flattenBooks(snapshot)) {
    await db.execute(
      `INSERT INTO catalog_books (
         catalog_id, title, author, isbn, cover_url, description,
         average_rating, ratings_count, popularity_count, genre,
         subjects_json, first_publish_year, open_library_key,
         google_books_id, hardcover_book_id, source, payload_json, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
         strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(catalog_id) DO UPDATE SET
         title=excluded.title, author=excluded.author, isbn=excluded.isbn,
         cover_url=excluded.cover_url, description=excluded.description,
         average_rating=excluded.average_rating, ratings_count=excluded.ratings_count,
         popularity_count=excluded.popularity_count, genre=excluded.genre,
         first_publish_year=excluded.first_publish_year,
         open_library_key=excluded.open_library_key,
         google_books_id=excluded.google_books_id,
         hardcover_book_id=excluded.hardcover_book_id,
         source=excluded.source, payload_json=excluded.payload_json,
         updated_at=excluded.updated_at`,
      [
        book.id, book.title, book.author, book.isbn ?? null, book.coverUrl,
        book.description ?? null, book.averageRating ?? null,
        book.ratingsCount ?? null, book.popularityCount ?? null, book.genre,
        "[]", book.firstPublishYear ?? null, book.openLibraryKey ?? null,
        book.googleBooksId ?? null, book.hardcoverBookId ?? null,
        book.metadataSource ?? snapshot.source, JSON.stringify(book),
      ],
    );
  }
}

export async function deleteCatalogSnapshot(key: string): Promise<void> {
  if (!isTauriRuntime()) {
    const snapshots = loadBrowserSnapshots();
    delete snapshots[key];
    window.localStorage.setItem(browserCacheKey, JSON.stringify(snapshots));
    return;
  }
  const db = await getDb();
  await db.execute("DELETE FROM catalog_snapshots WHERE snapshot_key = $1", [key]);
}
