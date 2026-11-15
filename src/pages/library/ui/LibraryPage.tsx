import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookGridCard, rememberCatalogBook } from "@/entities/catalog";
import { LIBRARY_STATUS_LABEL, useLibrary, type LibraryStatus } from "@/entities/library";
import { useToast } from "@/shared/ui";
import type { BookshelfBook } from "@/types/bookshelf";
import "@/entities/catalog/ui/book-grid.css";
import "@/pages/catalog/ui/catalog-page.css";
import "./library-page.css";

export function LibraryPage() {
  const { entries, ready, importEpub } = useLibrary();
  const { notify } = useToast();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<LibraryStatus | "all" | "favorites">("all");
  const [isImporting, setIsImporting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const visible = useMemo(
    () =>
      status === "all"
        ? entries
        : status === "favorites"
          ? entries.filter((entry) => entry.favorite)
          : entries.filter((entry) => entry.status === status),
    [entries, status],
  );

  const open = (book: BookshelfBook) => {
    rememberCatalogBook(book);
    navigate(`/livro/${encodeURIComponent(book.id)}`, { state: { book } });
  };

  const handleProcessFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".epub")) {
      notify("Por favor, selecione um arquivo válido no formato .epub", "error");
      return;
    }

    setIsImporting(true);
    notify(`Importando "${file.name}"…`);

    try {
      const importedBook = await importEpub(file);
      notify(`"${importedBook.title}" adicionado à sua biblioteca!`);
    } catch (error) {
      console.error("Falha ao importar EPUB:", error);
      notify("Não foi possível ler este arquivo EPUB. Verifique se o arquivo está íntegro.", "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleProcessFile(file);
    }
  };

  return (
    <main
      className="library-page"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".epub,application/epub+zip"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleProcessFile(file);
          e.target.value = "";
        }}
      />

      {isDraggingOver && (
        <div className="library-drop-overlay">
          <div className="library-drop-card">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"
                strokeWidth="2"
              />
              <path
                d="M12 7v8m0 0 3-3m-3 3-3-3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h3>Solte seu arquivo EPUB aqui</h3>
            <p>O livro será adicionado instantaneamente à sua estante com metadados e capa.</p>
          </div>
        </div>
      )}

      <header className="product-page-heading">
        <div>
          <p>Sua coleção</p>
          <h1>Minha Biblioteca</h1>
          <span>
            {entries.length} {entries.length === 1 ? "livro guardado" : "livros guardados"}
          </span>
        </div>
        <div className="library-header-actions">
          <button
            type="button"
            className="library-import-action"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            title="Importar um arquivo EPUB do computador"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                d="M12 4v12m0-12 4 4m-4-4L8 8m-4 12h16"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>{isImporting ? "Importando…" : "Importar EPUB"}</span>
          </button>
          <button
            type="button"
            className="library-discover-action"
            onClick={() => navigate("/catalogo")}
          >
            Descobrir livros
          </button>
        </div>
      </header>

      <div className="library-tabs" role="tablist" aria-label="Filtrar biblioteca">
        {(["all", "want-to-read", "reading", "completed", "favorites"] as const).map(
          (value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={status === value}
              onClick={() => setStatus(value)}
            >
              {value === "all"
                ? "Todos"
                : value === "favorites"
                  ? "Favoritos"
                  : LIBRARY_STATUS_LABEL[value]}
              <span>
                {value === "all"
                  ? entries.length
                  : value === "favorites"
                    ? entries.filter((entry) => entry.favorite).length
                    : entries.filter((entry) => entry.status === value).length}
              </span>
            </button>
          ),
        )}
      </div>

      {!ready ? (
        <div className="catalog-grid-skeleton">
          <span className="metadata-shimmer" />
          <span className="metadata-shimmer" />
        </div>
      ) : visible.length ? (
        <section className="book-grid">
          {visible.map((entry) => (
            <BookGridCard
              key={entry.book.id}
              book={entry.book}
              badge={
                entry.favorite
                  ? "Favorito"
                  : entry.book.hasEpub
                    ? `EPUB · ${LIBRARY_STATUS_LABEL[entry.status]}`
                    : LIBRARY_STATUS_LABEL[entry.status]
              }
              onOpen={open}
            />
          ))}
        </section>
      ) : (
        <section className="product-empty">
          <div className="product-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"
                strokeWidth="1.8"
              />
              <path
                d="m9 9.5 3 3 5-5"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2>
            {entries.length
              ? "Nenhum livro neste filtro"
              : "Sua biblioteca espera a primeira história"}
          </h2>
          <p>
            Importe seus arquivos .epub favoritos ou adicione livros do catálogo aberto para montar sua coleção pessoal offline.
          </p>
          <div className="product-empty-actions">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
            >
              Importar arquivo EPUB
            </button>
            <button
              type="button"
              className="is-secondary"
              onClick={() => navigate("/catalogo")}
            >
              Explorar catálogo
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
