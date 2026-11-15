import type { BookshelfBook } from "@/types/bookshelf";

export type LibraryStatus = "want-to-read" | "reading" | "completed";

export interface LibraryEntry {
  book: BookshelfBook;
  status: LibraryStatus;
  favorite: boolean;
  personalRating: number | null;
  progress: number;
  addedAt: string;
  updatedAt: string;
}

export const LIBRARY_STATUS_LABEL: Record<LibraryStatus, string> = {
  "want-to-read": "Quero ler",
  reading: "Lendo",
  completed: "Concluído",
};
