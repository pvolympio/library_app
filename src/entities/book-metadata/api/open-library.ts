import type { BookMetadataInput, MetadataMatch } from "../model/book-metadata";
import { scoreBookMatch } from "../lib/book-match";
import { queuedJsonRequest } from "../lib/metadata-request-queue";

interface OpenLibraryDocument {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  ratings_average?: number;
  ratings_count?: number;
}

interface OpenLibraryWorkResponse {
  description?: string | { value?: string };
}

interface OpenLibrarySearchResponse { docs?: OpenLibraryDocument[] }

export interface OpenLibraryMetadata {
  coverUrl: string | null;
  description: string | null;
  averageRating: number | null;
  ratingsCount: number | null;
  workKey: string | null;
  matchedBy: MetadataMatch;
}

async function searchOpenLibrary(url: URL, priority: number): Promise<OpenLibraryDocument[]> {
  const response = await queuedJsonRequest<OpenLibrarySearchResponse>(url.toString(), priority);
  return response.docs ?? [];
}

function descriptionValue(description: OpenLibraryWorkResponse["description"]): string | null {
  if (typeof description === "string") return description.trim() || null;
  return description?.value?.trim() || null;
}

async function fetchWorkDescription(key: string | undefined, priority: number): Promise<string | null> {
  if (!key?.startsWith("/works/")) return null;
  try {
    const work = await queuedJsonRequest<OpenLibraryWorkResponse>(`https://openlibrary.org${key}.json`, priority);
    return descriptionValue(work.description);
  } catch {
    return null;
  }
}

async function toMetadata(
  book: OpenLibraryDocument,
  matchedBy: MetadataMatch,
  priority: number,
): Promise<OpenLibraryMetadata> {
  return {
    coverUrl: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg?default=false` : null,
    description: await fetchWorkDescription(book.key, priority),
    averageRating: typeof book.ratings_average === "number" && book.ratings_average > 0 ? book.ratings_average : null,
    ratingsCount: typeof book.ratings_count === "number" && book.ratings_count > 0 ? book.ratings_count : null,
    workKey: book.key ?? null,
    matchedBy,
  };
}

export async function fetchOpenLibraryMetadata(
  input: BookMetadataInput,
  priority: number,
): Promise<OpenLibraryMetadata> {
  if (input.isbn) {
    const isbnUrl = new URL("https://openlibrary.org/search.json");
    isbnUrl.searchParams.set("q", `isbn:${input.isbn}`);
    isbnUrl.searchParams.set("fields", "key,title,author_name,cover_i,ratings_average,ratings_count");
    isbnUrl.searchParams.set("limit", "5");
    const isbnResult = (await searchOpenLibrary(isbnUrl, priority)).find((book) => book.cover_i);
    if (isbnResult?.cover_i) {
      return toMetadata(isbnResult, "isbn", priority);
    }
  }

  const fallbackUrl = new URL("https://openlibrary.org/search.json");
  fallbackUrl.searchParams.set("title", input.title);
  fallbackUrl.searchParams.set("author", input.author);
  fallbackUrl.searchParams.set("fields", "key,title,author_name,cover_i,ratings_average,ratings_count");
  fallbackUrl.searchParams.set("limit", "8");
  const candidates = await searchOpenLibrary(fallbackUrl, priority);
  const match = candidates
    .filter((book) => book.cover_i)
    .map((book) => ({ book, score: scoreBookMatch(input.title, input.author, book.title ?? "", book.author_name ?? []) }))
    .sort((left, right) => right.score - left.score)[0];

  if (!match || match.score < 5 || !match.book.cover_i) {
    return { coverUrl: null, description: null, averageRating: null, ratingsCount: null, workKey: null, matchedBy: "none" };
  }
  return toMetadata(match.book, "title-author", priority);
}
