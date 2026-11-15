import type { BookshelfBook } from "@/types/bookshelf";

export type CatalogSource = "open-library" | "open-library+hardcover" | "google-books";

export interface CatalogShelf {
  id: string;
  title: string;
  subtitle: string;
  source: CatalogSource;
  books: BookshelfBook[];
}

export interface CatalogSnapshot {
  key: string;
  source: CatalogSource;
  shelves: CatalogShelf[];
  createdAt: string;
}

export interface CatalogSearchResult {
  query: string;
  books: BookshelfBook[];
  total: number;
  page: number;
  hasMore: boolean;
  source: CatalogSource;
}

export interface CatalogLoadOptions {
  forceRefresh?: boolean;
}
