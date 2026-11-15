import type { BookshelfBook } from "@/types/bookshelf";
import { normalizeTitle, spineColorFor } from "../lib/book-presentation";

interface HardcoverBook {
  id: number;
  title: string;
  rating: number | string | null;
  ratings_count: number | null;
  users_count: number | null;
  users_read_count: number | null;
  contributions?: Array<{ author?: { name?: string | null } | null }>;
  default_cover_edition?: { isbn_13?: string | null; isbn_10?: string | null } | null;
}

interface HardcoverResponse {
  data?: { books?: HardcoverBook[]; books_trending?: { ids?: number[]; error?: string | null } | null };
  errors?: Array<{ message?: string }>;
}

async function hardcoverRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = import.meta.env.VITE_HARDCOVER_API_TOKEN?.trim();
  if (!token) throw new Error("Token do Hardcover não configurado");
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.hardcover.app/v1/graphql", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Hardcover respondeu HTTP ${response.status}`);
    const payload = await response.json() as { data?: T; errors?: Array<{ message?: string }> };
    if (payload.errors?.length) throw new Error(payload.errors[0].message ?? "Consulta Hardcover inválida");
    if (!payload.data) throw new Error("Hardcover não retornou dados");
    return payload.data;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function hasHardcoverToken(): boolean {
  return Boolean(import.meta.env.VITE_HARDCOVER_API_TOKEN?.trim());
}

export async function enhanceWithHardcover(books: BookshelfBook[]): Promise<BookshelfBook[]> {
  if (!hasHardcoverToken() || books.length === 0) return books;

  const titles = [...new Set(books.map((book) => book.title))].slice(0, 40);
  const payload = await hardcoverRequest<NonNullable<HardcoverResponse["data"]>>(
    `query CatalogStats($titles: [String!]!) {
          books(where: { title: { _in: $titles } }, limit: 40) {
            id title rating ratings_count users_count users_read_count
          }
        }`,
    { titles },
  );
    const byTitle = new Map(
      (payload.books ?? []).map((book) => [normalizeTitle(book.title), book]),
    );
    return books.map((book) => {
      const stats = byTitle.get(normalizeTitle(book.title));
      if (!stats) return book;
      const rating = typeof stats.rating === "string" ? Number(stats.rating) : stats.rating;
      return {
        ...book,
        averageRating: Number.isFinite(rating) ? Number(rating) : book.averageRating,
        ratingsCount: stats.ratings_count ?? book.ratingsCount,
        popularityCount: stats.users_count ?? stats.users_read_count ?? book.popularityCount,
        hardcoverBookId: String(stats.id),
        metadataSource: "hardcover" as const,
      };
    }).sort((left, right) => (right.popularityCount ?? 0) - (left.popularityCount ?? 0));
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchHardcoverRecommendations(limit = 16): Promise<BookshelfBook[]> {
  if (!hasHardcoverToken()) return [];
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  const trending = await hardcoverRequest<NonNullable<HardcoverResponse["data"]>>(
    `query TrendingBooks($from: date!, $to: date!, $limit: Int!) {
      books_trending(from: $from, to: $to, limit: $limit, offset: 0) { ids error }
    }`,
    { from: isoDate(from), to: isoDate(to), limit },
  );
  const ids = trending.books_trending?.ids?.slice(0, limit) ?? [];
  if (ids.length === 0) return [];

  const details = await hardcoverRequest<NonNullable<HardcoverResponse["data"]>>(
    `query TrendingBookDetails($ids: [Int!]!, $limit: Int!) {
      books(where: { id: { _in: $ids } }, limit: $limit) {
        id title rating ratings_count users_count users_read_count
        contributions(limit: 3) { author { name } }
        default_cover_edition { isbn_13 isbn_10 }
      }
    }`,
    { ids, limit },
  );
  const order = new Map(ids.map((id, index) => [id, index]));
  return (details.books ?? [])
    .sort((left, right) => (order.get(left.id) ?? 999) - (order.get(right.id) ?? 999))
    .map((book) => {
      const isbn = book.default_cover_edition?.isbn_13 ?? book.default_cover_edition?.isbn_10 ?? undefined;
      const author = book.contributions?.map((item) => item.author?.name).filter(Boolean).join(", ") || "Autor desconhecido";
      const rating = typeof book.rating === "string" ? Number(book.rating) : book.rating;
      return {
        id: `hardcover:${book.id}`,
        metadataKey: `hardcover:${book.id}`,
        title: book.title,
        author,
        isbn,
        coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn ?? "0000000000000"}-L.jpg?default=false`,
        spineColor: spineColorFor(`hardcover:${book.id}`),
        genre: "Em alta",
        averageRating: Number.isFinite(rating) ? Number(rating) : undefined,
        ratingsCount: book.ratings_count ?? undefined,
        popularityCount: book.users_count ?? book.users_read_count ?? undefined,
        hardcoverBookId: String(book.id),
        metadataSource: "hardcover" as const,
      } satisfies BookshelfBook;
    });
}
