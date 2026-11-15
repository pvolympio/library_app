import { memo, useState } from "react";
import type { BookshelfBook } from "@/types/bookshelf";

interface BookGridCardProps { book: BookshelfBook; badge?: string; onOpen: (book: BookshelfBook) => void }

function BookGridCardComponent({ book, badge, onOpen }: BookGridCardProps) {
  const [failed, setFailed] = useState(false);
  return <article className="book-grid-card"><button type="button" onClick={() => onOpen(book)} aria-label={`Ver ${book.title}, de ${book.author}`}>
    <span className="book-grid-cover">
      {!failed && book.coverUrl ? <img src={book.coverUrl} alt={`Capa de ${book.title}`} width="300" height="450" loading="lazy" onError={() => setFailed(true)} /> : <span className="book-grid-fallback"><strong>{book.title}</strong><small>{book.author}</small></span>}
      {badge ? <em>{badge}</em> : null}<i className="book-grid-ribbon" aria-hidden="true" />
    </span>
    <span className="book-grid-copy"><strong>{book.title}</strong><span>{book.author}</span><small>{book.averageRating ? <>★ {book.averageRating.toFixed(1)}</> : book.firstPublishYear ?? "Descobrir"}</small></span>
  </button></article>;
}
export const BookGridCard = memo(BookGridCardComponent);
