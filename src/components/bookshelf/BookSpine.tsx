import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTheme } from "@/hooks/useTheme";
import type { BookshelfBook } from "@/types/bookshelf";
import { COVER_WIDTH, OPEN_ROTATION_DEG } from "./constants";
import { BookHoverEffect } from "./BookHoverEffect";
import { getBookAppearance } from "./bookAppearance";

const LONG_PRESS_MS = 160;

const springTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 22,
};

export interface BookSpineProps {
  book: BookshelfBook;
  /** Livro alinha no scroll-snap da prateleira (opcional, ver requisito 4) */
  snap?: boolean;
  /** Chamado quando o usuário "abre" o livro (útil para futura navegação ao leitor) */
  onOpen?: (book: BookshelfBook) => void;
  /** Informa a célula virtualizada para elevar o livro acima dos vizinhos. */
  onActiveChange?: (active: boolean) => void;
}

export function BookSpine({ book, snap = true, onOpen, onActiveChange }: BookSpineProps) {
  const { theme } = useTheme();
  const [active, setActive] = useState(false);
  const [burst, setBurst] = useState(0);
  const [coverReady, setCoverReady] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const appearance = getBookAppearance(book);
  const bookStyle = {
    width: appearance.width,
    height: appearance.height,
    "--book-spine": book.spineColor,
    "--book-ink": appearance.ink,
    "--book-width": `${appearance.width}px`,
    "--book-height": `${appearance.height}px`,
  } as CSSProperties;

  useEffect(() => {
    setCoverReady(false);
    setCoverFailed(false);
  }, [book.coverUrl]);

  const reveal = useCallback(() => {
    setActive(true);
    onActiveChange?.(true);
    setBurst((value) => value + 1);
  }, [onActiveChange]);

  const dismiss = useCallback(() => {
    setActive(false);
    onActiveChange?.(false);
  }, [onActiveChange]);

  const clearPressTimer = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }, []);

  // Desktop: hover simples, sem delay.
  const handleMouseEnter = reveal;
  const handleMouseLeave = dismiss;

  // Mobile: "tocar e segurar" — um pequeno atraso evita confundir com um
  // scroll horizontal da prateleira (que também começa com um toque).
  const handleTouchStart = useCallback(() => {
    clearPressTimer();
    pressTimer.current = setTimeout(reveal, LONG_PRESS_MS);
  }, [clearPressTimer, reveal]);

  const handleTouchEnd = useCallback(() => {
    clearPressTimer();
    dismiss();
  }, [clearPressTimer, dismiss]);

  // Acessibilidade: foco por teclado também revela a capa.
  const handleFocus = reveal;
  const handleBlur = dismiss;

  const handleActivate = useCallback(() => {
    onOpen?.(book);
  }, [book, onOpen]);

  return (
    <div
      className="book-slot relative shrink-0"
      style={{
        width: appearance.width,
        height: appearance.height,
        zIndex: active ? 20 : 1,
        scrollSnapAlign: snap ? "start" : undefined,
      }}
    >
      <BookHoverEffect themeId={theme.id} active={active} burst={burst} reducedMotion={reducedMotion} />
      <motion.span
        className="book-contact-shadow"
        style={{ width: appearance.width + 8 }}
        animate={{ opacity: active ? 0.22 : 0.48, scaleX: active ? 0.72 : 1 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
        aria-hidden="true"
      />
      <motion.button
        type="button"
        className={`book-3d binding-${appearance.binding}`}
        style={bookStyle}
        initial={reducedMotion ? false : { opacity: 0, y: 10, rotateZ: appearance.lean }}
        animate={{
          opacity: 1,
          rotateY: active ? OPEN_ROTATION_DEG : 0,
          rotateZ: active ? 0 : appearance.lean,
          y: active ? -11 : 0,
          z: active ? 38 : 0,
        }}
        transition={reducedMotion ? { duration: 0 } : {
          ...springTransition,
          opacity: { duration: 0.22, delay: appearance.entranceDelay },
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleActivate}
        aria-label={`Abrir detalhes de ${book.title}, de ${book.author}`}
        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      >
        {/* Lombada — face visível em repouso */}
        <div
          className="book-face book-spine-face"
          style={{
            width: appearance.width,
            height: appearance.height,
          }}
        >
          <span className="spine-edge-highlight" aria-hidden="true" />
          <span className="spine-cap spine-cap-top" aria-hidden="true" />
          <span className="spine-ornament" aria-hidden="true" />
          <span className="spine-title" title={book.title}>
            {book.title}
          </span>
          <span className="spine-author" title={book.author}>
            {appearance.authorLabel}
          </span>
          <span className="spine-cap spine-cap-bottom" aria-hidden="true" />
          <span className="spine-ribs" aria-hidden="true"><i /><i /><i /></span>
        </div>

        <div
          className="book-face book-page-block"
          style={{ width: COVER_WIDTH - 7, height: appearance.height - 8 }}
          aria-hidden="true"
        />

        {/* Capa — revelada ao girar o livro para fora da prateleira */}
        <div
          className="book-face book-cover-face"
          style={{ width: COVER_WIDTH, height: appearance.height }}
        >
          {(book.coverLoading || !coverReady) && !coverFailed && (
            <div className="metadata-shimmer book-cover-skeleton" aria-hidden="true" />
          )}
          {coverFailed ? (
            <div
              className="book-cover-fallback metadata-fade-in"
              role="img"
              aria-label={`Capa indisponível de ${book.title}`}
            >
              <strong>{book.title}</strong>
              <span>{book.author}</span>
            </div>
          ) : (
            <img
              className={coverReady && !book.coverLoading ? "metadata-fade-in" : "book-cover-pending"}
              src={book.coverUrl}
              alt={`Capa de ${book.title}`}
              width={COVER_WIDTH}
              height={appearance.height}
              loading={book.coverLoading ? "lazy" : "eager"}
              draggable={false}
              onLoad={() => setCoverReady(true)}
              onError={() => {
                setCoverFailed(true);
                setCoverReady(true);
              }}
            />
          )}
          <div className="cover-shine" aria-hidden="true" />
        </div>
      </motion.button>
    </div>
  );
}
