import { useCallback, useRef } from "react";
import type { BookshelfBook } from "@/types/bookshelf";
import { FaceOutBook } from "./FaceOutBook";

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ShelfProps {
  label: string;
  description?: string;
  sourceLabel?: string;
  books: BookshelfBook[];
  snap?: boolean;
  featured?: boolean;
  onViewAll?: () => void;
  onOpenBook?: (book: BookshelfBook) => void;
}

export function Shelf({
  label,
  description,
  sourceLabel,
  books,
  snap = true,
  featured = false,
  onViewAll,
  onOpenBook,
}: ShelfProps) {
  const railRef = useRef<HTMLDivElement>(null);

  const move = useCallback((direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * rail.clientWidth * 0.78, behavior: "smooth" });
  }, []);

  return (
    <section className={`display-shelf${featured ? " display-shelf-featured" : ""}`} aria-label={`Prateleira: ${label}`}>
      <header className="shelf-heading">
        <div className="shelf-heading-copy">
          <div className="shelf-kicker">
            <span className="shelf-index" aria-hidden="true">{featured ? "Seleção do dia" : "Curadoria aberta"}</span>
            {sourceLabel ? <span className="shelf-source">{sourceLabel}</span> : null}
          </div>
          <h2>{label}</h2>
          {description ? <p className="shelf-description">{description}</p> : null}
        </div>
        <div className="shelf-heading-actions">
          <span className="shelf-book-count">{books.length} obras</span>
          {onViewAll ? <button type="button" className="shelf-view-all" onClick={onViewAll}>Ver todos</button> : null}
          <button type="button" onClick={() => move(-1)} aria-label={`Voltar na prateleira ${label}`}>
            <ArrowIcon direction="left" />
          </button>
          <button type="button" onClick={() => move(1)} aria-label={`Avançar na prateleira ${label}`}>
            <ArrowIcon direction="right" />
          </button>
        </div>
      </header>

      <div className="shelf-stage">
        <div
          ref={railRef}
          className="shelf-rail"
          style={{ scrollSnapType: snap ? "x mandatory" : undefined }}
          tabIndex={0}
          aria-label={`Livros em ${label}. Use as setas ou role horizontalmente.`}
        >
          {books.map((book, index) => (
            <FaceOutBook
              key={`${book.id}-${index}`}
              book={book}
              onOpen={onOpenBook}
              priority={featured && index < 6}
            />
          ))}
        </div>
        <div className="shelf-plank" aria-hidden="true">
          <span />
        </div>
      </div>
    </section>
  );
}
