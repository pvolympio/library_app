import { useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { BookshelfBook, BookshelfGroupBy } from "@/types/bookshelf";
import { Shelf } from "./Shelf";
import { EmptyState } from "./EmptyState";
import { groupBooks } from "./groupBooks";
import "./bookshelf.css";

const GROUP_LABEL: Record<BookshelfGroupBy, string> = {
  genre: "gênero",
  author: "autor",
  shelf: "estante",
};

export interface BookshelfProps {
  books: BookshelfBook[];
  /** Critério de agrupamento vertical das prateleiras (padrão: "genre") */
  groupBy?: BookshelfGroupBy;
  /** Scroll-snap por livro dentro de cada prateleira (padrão: true) */
  snap?: boolean;
  /** Chamado ao clicar/ativar um livro (ex: abrir o leitor, no futuro) */
  onOpenBook?: (book: BookshelfBook) => void;
  className?: string;
}

/**
 * Estante de livros em 3D.
 *
 * - Cada prateleira é um grupo (por gênero/autor/estante), com scroll
 *   horizontal virtualizado (ver `Shelf`/`react-window`).
 * - Cada livro mostra a lombada por padrão e revela a capa com um tilt 3D
 *   ao passar o mouse ou tocar e segurar (ver `BookSpine`/Framer Motion).
 * - As cores/textura de fundo vêm do tema ativo via CSS custom properties
 *   (ver bookshelf.css), então a estante muda de "madeira" com o tema.
 */
export function Bookshelf({
  books,
  groupBy = "genre",
  snap = true,
  onOpenBook,
  className,
}: BookshelfProps) {
  const { theme } = useTheme();
  const groups = useMemo(() => groupBooks(books, groupBy), [books, groupBy]);
  const formatGroupLabel = (label: string) => {
    if (groupBy !== "genre") return label;
    if (theme.id === "alice") return `Sala do Chá: ${label}`;
    if (theme.id === "harry-potter") return `Salão: ${label}`;
    return `Cabana: ${label}`;
  };

  return (
    <div
      className={["bookshelf-backdrop p-4 sm:p-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      {groups.length === 0 ? (
        <EmptyState groupByLabel={GROUP_LABEL[groupBy]} />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group) => (
            <Shelf
              key={group.key}
              label={formatGroupLabel(group.label)}
              books={group.books}
              snap={snap}
              onOpenBook={onOpenBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}
