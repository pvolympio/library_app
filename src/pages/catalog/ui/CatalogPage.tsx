import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BookGridCard,
  downloadOnlineBookAsFile,
  loadCatalogDiscovery,
  rememberCatalogBook,
  searchCatalog,
  searchOnlineBooks,
  type CatalogSnapshot,
  type OnlineBookResult,
} from "@/entities/catalog";
import { useLibrary } from "@/entities/library";
import { useToast } from "@/shared/ui";
import type { BookshelfBook } from "@/types/bookshelf";
import "@/entities/catalog/ui/book-grid.css";
import "./catalog-page.css";

type SortMode = "relevance" | "rating" | "year" | "popularity";
type CatalogTab = "discover" | "online";

export function CatalogPage() {
  const navigate = useNavigate();
  const { importEpub } = useLibrary();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();

  const tab = (params.get("aba") as CatalogTab) === "online" ? "online" : "discover";
  const query = params.get("q") ?? "";
  const genre = params.get("genero") ?? "Todos";
  const lang = params.get("idioma") ?? "";
  const sort = (params.get("ordem") as SortMode) || "relevance";

  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [books, setBooks] = useState<BookshelfBook[]>([]);
  const [loading, setLoading] = useState(true);

  const [onlineResults, setOnlineResults] = useState<OnlineBookResult[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [manualFallback, setManualFallback] = useState<{
    title: string;
    url: string;
    message: string;
  } | null>(null);

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (tab !== "discover") return;
    let active = true;
    setLoading(true);
    const promise =
      deferredQuery.length >= 2 ? searchCatalog(deferredQuery) : loadCatalogDiscovery();
    void promise
      .then((result) => {
        if (!active) return;
        if ("shelves" in result) {
          setSnapshot(result);
          const unique = new Map<string, BookshelfBook>();
          result.shelves.forEach((shelf) =>
            shelf.books.forEach((book) => unique.set(book.id, book)),
          );
          setBooks([...unique.values()]);
        } else {
          setBooks(result.books);
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [deferredQuery, tab]);

  useEffect(() => {
    if (tab !== "online") return;
    const trimmed = deferredQuery.trim();
    if (trimmed.length < 2) {
      setOnlineResults([]);
      setOnlineError(null);
      setOnlineLoading(false);
      return;
    }

    let active = true;
    setOnlineLoading(true);
    setOnlineError(null);
    setManualFallback(null);

    void searchOnlineBooks(trimmed, lang)
      .then((data) => {
        if (!active) return;
        setOnlineResults(data.results);
      })
      .catch(() => {
        if (!active) return;
        setOnlineError(
          "Não foi possível consultar o acervo online agora. Tente novamente em instantes.",
        );
      })
      .finally(() => {
        if (active) setOnlineLoading(false);
      });

    return () => {
      active = false;
    };
  }, [deferredQuery, lang, tab]);

  const genres = useMemo(
    () => [
      "Todos",
      ...new Set(
        (
          snapshot?.shelves
            .slice(1)
            .map((shelf) => shelf.books[0]?.genre)
            .filter(Boolean) ?? books.map((book) => book.genre)
        ).filter(Boolean),
      ),
    ],
    [books, snapshot],
  );

  const visible = useMemo(() => {
    const filtered =
      genre === "Todos" ? [...books] : books.filter((book) => book.genre === genre);
    if (sort === "rating")
      filtered.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
    if (sort === "year")
      filtered.sort((a, b) => (b.firstPublishYear ?? 0) - (a.firstPublishYear ?? 0));
    if (sort === "popularity")
      filtered.sort(
        (a, b) =>
          (b.popularityCount ?? b.ratingsCount ?? 0) -
          (a.popularityCount ?? a.ratingsCount ?? 0),
      );
    return filtered;
  }, [books, genre, sort]);

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    setParams(next);
  };

  const switchTab = (nextTab: CatalogTab) => {
    const next = new URLSearchParams(params);
    if (nextTab === "online") {
      next.set("aba", "online");
    } else {
      next.delete("aba");
    }
    setParams(next);
  };

  const open = useCallback(
    (book: BookshelfBook) => {
      rememberCatalogBook(book);
      navigate(`/livro/${encodeURIComponent(book.id)}`, { state: { book } });
    },
    [navigate],
  );

  const handleDownloadAndRead = async (book: OnlineBookResult) => {
    setDownloadingId(book.id);
    setManualFallback(null);
    notify(`Baixando “${book.title}”…`);

    try {
      const outcome = await downloadOnlineBookAsFile(book);
      if (outcome.ok) {
        const imported = await importEpub(outcome.file);
        notify(`“${imported.title}” salvo na sua estante!`);
        navigate(`/ler/${encodeURIComponent(imported.id)}`);
      } else {
        if (outcome.fallbackPageUrl) {
          setManualFallback({
            title: book.title,
            url: outcome.fallbackPageUrl,
            message: outcome.message,
          });
        }
        notify(outcome.message);
      }
    } catch {
      notify("Não foi possível importar o arquivo EPUB.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <main className="catalog-grid-page">
      <header className="product-page-heading">
        <div>
          <p>{tab === "online" ? "Busca automática de EPUB" : "Catálogo mundial"}</p>
          <h1>
            {tab === "online"
              ? query
                ? `EPUBs para “${query}”`
                : "Baixar livros grátis para ler"
              : query
                ? `Resultados para “${query}”`
                : "Explore todas as histórias"}
          </h1>
          <span>
            {tab === "online"
              ? onlineLoading
                ? "Buscando arquivos EPUB disponíveis…"
                : `${onlineResults.length.toLocaleString("pt-BR")} arquivos encontrados`
              : loading
                ? "Organizando o catálogo…"
                : `${visible.length.toLocaleString("pt-BR")} obras nesta seleção`}
          </span>
        </div>

        <div className="catalog-mode-tabs" role="tablist" aria-label="Modo de busca">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "discover"}
            onClick={() => switchTab("discover")}
          >
            Explorar Catálogo
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "online"}
            onClick={() => switchTab("online")}
          >
            Baixar EPUB Grátis
          </button>
        </div>
      </header>

      <section className="catalog-filter-bar" aria-label="Filtros do catálogo">
        <label>
          <span>Buscar</span>
          <input
            name="catalog-query"
            value={query}
            onChange={(event) => update("q", event.target.value)}
            placeholder={
              tab === "online"
                ? "Digite o nome do livro ou autor para baixar…"
                : "Título, autor ou ISBN…"
            }
            autoComplete="off"
          />
        </label>

        {tab === "discover" ? (
          <>
            <label>
              <span>Gênero</span>
              <select value={genre} onChange={(event) => update("genero", event.target.value)}>
                {genres.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Ordenar</span>
              <select value={sort} onChange={(event) => update("ordem", event.target.value)}>
                <option value="relevance">Relevância</option>
                <option value="popularity">Popularidade</option>
                <option value="rating">Melhor avaliação</option>
                <option value="year">Mais recentes</option>
              </select>
            </label>
          </>
        ) : (
          <label>
            <span>Idioma</span>
            <select value={lang} onChange={(event) => update("idioma", event.target.value)}>
              <option value="">Todos os idiomas</option>
              <option value="pt">Português</option>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
            </select>
          </label>
        )}

        {query || genre !== "Todos" || sort !== "relevance" || lang ? (
          <button
            type="button"
            onClick={() => setParams(tab === "online" ? { aba: "online" } : {})}
          >
            Limpar filtros
          </button>
        ) : null}
      </section>

      {tab === "online" ? (
        <>
          {manualFallback ? (
            <div className="online-fallback-banner" role="status">
              <div>
                <strong>Download assistido: {manualFallback.title}</strong>
                <p>{manualFallback.message}</p>
              </div>
              <div className="online-fallback-actions">
                <a
                  href={manualFallback.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="online-fallback-link"
                >
                  Abrir página de download
                </a>
                <button
                  type="button"
                  onClick={() => navigate("/biblioteca")}
                  className="online-fallback-library"
                >
                  Ir para Minha Estante
                </button>
              </div>
            </div>
          ) : null}

          {query.trim().length < 2 ? (
            <section className="product-empty">
              <div className="product-empty-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2>Busque qualquer livro para ler na hora</h2>
              <p>
                Digite pelo menos 2 letras no campo acima para encontrar livros em formato EPUB
                no Anna&apos;s Archive e acervos públicos gratuitos.
              </p>
            </section>
          ) : onlineLoading ? (
            <div className="catalog-grid-skeleton" role="status">
              {Array.from({ length: 8 }, (_, index) => (
                <span className="metadata-shimmer" key={index} />
              ))}
            </div>
          ) : onlineError ? (
            <section className="product-empty">
              <h2>Erro na busca online</h2>
              <p>{onlineError}</p>
            </section>
          ) : onlineResults.length ? (
            <section className="online-books-grid" aria-label="Livros disponíveis para download">
              {onlineResults.map((book) => {
                const isBusy = downloadingId === book.id;
                return (
                  <article key={book.id} className="online-book-card">
                    <div className="online-book-cover">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} alt="" loading="lazy" />
                      ) : (
                        <div className="online-book-cover-fallback" aria-hidden="true">
                          <span>{book.title.slice(0, 1).toUpperCase()}</span>
                        </div>
                      )}
                      <span className="online-book-badge">{book.extension.toUpperCase()}</span>
                    </div>

                    <div className="online-book-info">
                      <span className="online-book-source">
                        {book.sourceLabel}
                        {book.fileSize ? ` · ${book.fileSize}` : ""}
                      </span>
                      <h2 title={book.title}>{book.title}</h2>
                      <p className="online-book-author">{book.author}</p>

                      <button
                        type="button"
                        className="online-book-download-btn"
                        disabled={Boolean(downloadingId)}
                        onClick={() => void handleDownloadAndRead(book)}
                      >
                        {isBusy ? "Baixando livro…" : "Baixar e Ler"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="product-empty">
              <h2>Nenhum EPUB encontrado</h2>
              <p>
                Tente buscar usando apenas o título principal ou o sobrenome do autor, ou troque
                o filtro de idioma para &ldquo;Todos os idiomas&rdquo;.
              </p>
            </section>
          )}
        </>
      ) : loading ? (
        <div className="catalog-grid-skeleton" role="status">
          {Array.from({ length: 12 }, (_, index) => (
            <span className="metadata-shimmer" key={index} />
          ))}
        </div>
      ) : visible.length ? (
        <section className="book-grid" aria-label="Livros encontrados">
          {visible.map((book) => (
            <BookGridCard key={book.id} book={book} onOpen={open} />
          ))}
        </section>
      ) : (
        <section className="product-empty">
          <div className="product-empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
              <path d="m16.5 16.5 4.5 4.5" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h2>Nenhuma obra encontrada</h2>
          <p>Tente remover um filtro ou buscar apenas pelo título ou autor.</p>
          <div className="product-empty-actions">
            <button type="button" onClick={() => setParams({})}>
              Explorar catálogo completo
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
