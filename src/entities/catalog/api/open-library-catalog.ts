import type { BookshelfBook } from "@/types/bookshelf";
import { normalizeTitle, spineColorFor } from "../lib/book-presentation";

const OPEN_LIBRARY_FIELDS = [
  "key", "title", "author_name", "cover_i", "first_publish_year", "isbn",
  "subject", "ratings_average", "ratings_count", "readinglog_count",
].join(",");

interface OpenLibraryWork {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  subject?: string[];
  ratings_average?: number;
  ratings_count?: number;
  readinglog_count?: number;
}

interface OpenLibraryResponse {
  docs?: OpenLibraryWork[];
  works?: OpenLibraryWork[];
  numFound?: number;
}

let openLibraryTail: Promise<void> = Promise.resolve();
let lastOpenLibraryRequest = 0;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

async function requestOpenLibrary<T>(url: URL): Promise<T> {
  let release: () => void = () => {};
  const previous = openLibraryTail;
  openLibraryTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    const delay = Math.max(0, 1_050 - (Date.now() - lastOpenLibraryRequest));
    if (delay > 0) await wait(delay);
    lastOpenLibraryRequest = Date.now();
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
      if (!response.ok) throw new Error(`Open Library respondeu HTTP ${response.status}`);
      return await response.json() as T;
    } finally {
      globalThis.clearTimeout(timeout);
    }
  } finally {
    release();
  }
}

function genreFrom(work: OpenLibraryWork, fallback: string): string {
  const first = work.subject?.find((subject) => subject.length <= 32 && !subject.includes("--"));
  return first ?? fallback;
}

function mapWork(work: OpenLibraryWork, fallbackGenre: string): BookshelfBook | null {
  if (!work.key || !work.title) return null;
  const workId = work.key.replace("/works/", "");
  const coverUrl = work.cover_i
    ? `https://covers.openlibrary.org/b/id/${work.cover_i}-L.jpg?default=false`
    : `https://covers.openlibrary.org/b/olid/${workId}-L.jpg?default=false`;
  return {
    id: `ol:${workId}`,
    metadataKey: `open-library:${workId}`,
    title: work.title,
    author: work.author_name?.join(", ") || "Autor desconhecido",
    isbn: work.isbn?.find((value) => value.replace(/[^0-9Xx]/g, "").length === 13) ?? work.isbn?.[0],
    coverUrl,
    spineColor: spineColorFor(work.key),
    genre: genreFrom(work, fallbackGenre),
    averageRating: (work.ratings_average ?? 0) > 0 ? work.ratings_average : undefined,
    ratingsCount: (work.ratings_count ?? 0) > 0 ? work.ratings_count : undefined,
    popularityCount: work.readinglog_count,
    firstPublishYear: work.first_publish_year,
    openLibraryKey: work.key,
    metadataSource: "open-library",
  };
}

function compactWorks(works: OpenLibraryWork[], genre: string, limit: number): BookshelfBook[] {
  const seen = new Set<string>();
  const books: BookshelfBook[] = [];
  for (const work of works) {
    const book = mapWork(work, genre);
    const signature = book ? normalizeTitle(book.title) : "";
    if (!book || seen.has(signature)) continue;
    seen.add(signature);
    books.push(book);
    if (books.length >= limit) break;
  }
  return books;
}

export async function fetchOpenLibraryTrending(limit = 16): Promise<BookshelfBook[]> {
  const url = new URL("https://openlibrary.org/trending/daily.json");
  url.searchParams.set("limit", String(limit));
  const response = await requestOpenLibrary<OpenLibraryResponse>(url);
  return compactWorks(response.works ?? [], "Em alta", limit);
}

export async function fetchOpenLibrarySubject(
  subject: string,
  genre: string,
  limit = 16,
): Promise<BookshelfBook[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", `subject_key:\"${subject}\"`);
  url.searchParams.set("lang", "pt");
  url.searchParams.set("sort", "readinglog");
  url.searchParams.set("fields", OPEN_LIBRARY_FIELDS);
  url.searchParams.set("limit", String(Math.min(40, limit + 6)));
  const response = await requestOpenLibrary<OpenLibraryResponse>(url);
  return compactWorks(response.docs ?? [], genre, limit);
}

export async function searchOpenLibraryCatalog(
  query: string,
  page = 1,
  limit = 20,
): Promise<{ books: BookshelfBook[]; total: number }> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("lang", "pt");
  url.searchParams.set("fields", OPEN_LIBRARY_FIELDS);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(Math.min(40, limit)));
  const response = await requestOpenLibrary<OpenLibraryResponse>(url);
  return {
    books: compactWorks(response.docs ?? [], "Catálogo", limit),
    total: response.numFound ?? 0,
  };
}
