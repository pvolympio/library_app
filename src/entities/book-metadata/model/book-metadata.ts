import type { BookshelfBook } from "@/types/bookshelf";

export type MetadataMatch = "isbn" | "title-author" | "none";
export type MetadataStatus = "complete" | "incomplete";
export type ManualMetadataField = "title" | "author" | "cover" | "description" | "rating";

export interface BookMetadataInput {
  bookKey: string;
  isbn: string | null;
  title: string;
  author: string;
  manualFields: ManualMetadataField[];
}

export interface BookMetadata {
  bookKey: string;
  isbn: string | null;
  coverUrl: string | null;
  description: string | null;
  averageRating: number | null;
  ratingsCount: number | null;
  openLibraryKey: string | null;
  googleBooksId: string | null;
  matchedBy: MetadataMatch;
  status: MetadataStatus;
  manualFields: ManualMetadataField[];
  attemptedAt: string;
}

export function toMetadataInput(book: BookshelfBook): BookMetadataInput {
  return {
    bookKey: book.metadataKey ?? `library-book:${book.id}`,
    isbn: book.isbn?.replace(/[^0-9Xx]/g, "") || null,
    title: book.title,
    author: book.author,
    manualFields: book.manualFields ?? [],
  };
}

export function createIncompleteMetadata(input: BookMetadataInput): BookMetadata {
  return {
    bookKey: input.bookKey,
    isbn: input.isbn,
    coverUrl: null,
    description: null,
    averageRating: null,
    ratingsCount: null,
    openLibraryKey: null,
    googleBooksId: null,
    matchedBy: "none",
    status: "incomplete",
    manualFields: input.manualFields,
    attemptedAt: new Date().toISOString(),
  };
}
