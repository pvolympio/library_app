import type { BookshelfBook } from "@/types/bookshelf";

const ROUTE_BOOK_PREFIX = "library-app:route-book:";

export function rememberCatalogBook(book: BookshelfBook) {
  try { window.sessionStorage.setItem(`${ROUTE_BOOK_PREFIX}${book.id}`, JSON.stringify(book)); } catch { /* navegação continua na sessão atual */ }
}

export function recallCatalogBook(bookId: string): BookshelfBook | null {
  try {
    const value = window.sessionStorage.getItem(`${ROUTE_BOOK_PREFIX}${bookId}`);
    return value ? JSON.parse(value) as BookshelfBook : null;
  } catch { return null; }
}
