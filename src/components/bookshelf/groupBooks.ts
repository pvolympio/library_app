import type { BookshelfBook, BookshelfGroupBy } from "@/types/bookshelf";

export interface BookGroup {
  key: string;
  label: string;
  books: BookshelfBook[];
}

const FALLBACK_LABEL: Record<BookshelfGroupBy, string> = {
  genre: "Sem gênero",
  author: "Autor desconhecido",
  shelf: "Estante geral",
};

function keyFor(book: BookshelfBook, groupBy: BookshelfGroupBy): string {
  const value = groupBy === "shelf" ? book.shelf : book[groupBy];
  return value?.trim() || FALLBACK_LABEL[groupBy];
}

/**
 * Agrupa os livros conforme o critério escolhido, preservando a ordem de
 * chegada dentro de cada grupo e ordenando os grupos alfabeticamente
 * (com o rótulo de fallback sempre por último).
 */
export function groupBooks(
  books: BookshelfBook[],
  groupBy: BookshelfGroupBy,
): BookGroup[] {
  const groups = new Map<string, BookshelfBook[]>();

  for (const book of books) {
    const key = keyFor(book, groupBy);
    const existing = groups.get(key);
    if (existing) {
      existing.push(book);
    } else {
      groups.set(key, [book]);
    }
  }

  const fallback = FALLBACK_LABEL[groupBy];

  return Array.from(groups.entries())
    .map(([key, groupedBooks]) => ({ key, label: key, books: groupedBooks }))
    .sort((a, b) => {
      if (a.label === fallback) return 1;
      if (b.label === fallback) return -1;
      return a.label.localeCompare(b.label, "pt-BR");
    });
}
