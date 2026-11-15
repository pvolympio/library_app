import { memo, useCallback, useEffect, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import type { BookshelfBook } from "@/types/bookshelf";
import { BookHoverEffect } from "./BookHoverEffect";

export interface FaceOutBookProps {
  book: BookshelfBook;
  onOpen?: (book: BookshelfBook) => void;
  priority?: boolean;
}

function formatCompactNumber(value?: number): string | null {
  if (!value || value < 1) return null;
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function FaceOutBookComponent({ book, onOpen, priority = false }: FaceOutBookProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion() ?? false;
  const [active, setActive] = useState(false);
  const [burst, setBurst] = useState(0);
  const [coverReady, setCoverReady] = useState(false);
  const [coverFailed, setCoverFailed] = useState(!book.coverUrl);
  const ratingCount = formatCompactNumber(book.ratingsCount ?? book.popularityCount);

  useEffect(() => {
    setCoverReady(false);
    setCoverFailed(!book.coverUrl);
  }, [book.coverUrl]);

  const reveal = useCallback(() => {
    setActive(true);
    setBurst((value) => value + 1);
  }, []);

  const dismiss = useCallback(() => setActive(false), []);
  const open = useCallback(() => onOpen?.(book), [book, onOpen]);

  const style = {
    "--volume-color": book.spineColor,
  } as CSSProperties;

  return (
    <article className="faceout-book" style={style}>
      <BookHoverEffect
        themeId={theme.id}
        active={active}
        burst={burst}
        reducedMotion={reducedMotion}
      />
      <motion.button
        type="button"
        className="faceout-book-button"
        onMouseEnter={reveal}
        onMouseLeave={dismiss}
        onFocus={reveal}
        onBlur={dismiss}
        onClick={open}
        aria-label={`Ver detalhes de ${book.title}, de ${book.author}`}
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: active ? -7 : 0 }}
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
        transition={reducedMotion ? { duration: 0 } : {
          opacity: { duration: 0.35 },
          y: { type: "spring", stiffness: 360, damping: 25 },
        }}
      >
        <span className="faceout-book-object">
          <span className="faceout-volume-edge" aria-hidden="true" />
          <span className="faceout-cover">
            {(book.coverLoading || !coverReady) && !coverFailed ? (
              <span className="metadata-shimmer faceout-cover-skeleton" aria-hidden="true" />
            ) : null}
            {coverFailed ? (
              <span className="faceout-cover-fallback metadata-fade-in" role="img" aria-label={`Capa indisponível de ${book.title}`}>
                <i aria-hidden="true" />
                <strong>{book.title}</strong>
                <small>{book.author}</small>
              </span>
            ) : (
              <img
                className={coverReady && !book.coverLoading ? "metadata-fade-in" : "faceout-cover-pending"}
                src={book.coverUrl}
                alt={`Capa de ${book.title}`}
                width="320"
                height="480"
                loading={priority ? "eager" : "lazy"}
                draggable={false}
                onLoad={() => setCoverReady(true)}
                onError={() => {
                  setCoverFailed(true);
                  setCoverReady(true);
                }}
              />
            )}
            <span className="faceout-cover-glaze" aria-hidden="true" />
            {book.manualFields?.includes("cover") ? (
              <span className="faceout-manual-badge" title="Capa editada manualmente" aria-label="Capa editada manualmente">✎</span>
            ) : null}
          </span>
          <span className="faceout-pages" aria-hidden="true" />
          <span className="faceout-ribbon" aria-hidden="true" />
          <span className="faceout-open-cue" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </span>

        <span className="faceout-caption">
          <strong title={book.title}>{book.title}</strong>
          <span title={book.author}>{book.author}</span>
          {book.averageRating ? (
            <small className="faceout-rating" aria-label={`Avaliação ${book.averageRating.toFixed(1)} de 5`}>
              <i aria-hidden="true">★</i>{book.averageRating.toFixed(1)}
              {ratingCount ? <em>({ratingCount})</em> : null}
            </small>
          ) : (
            <small className="faceout-discover">Descobrir obra <span aria-hidden="true">→</span></small>
          )}
        </span>
      </motion.button>
    </article>
  );
}

export const FaceOutBook = memo(FaceOutBookComponent);
