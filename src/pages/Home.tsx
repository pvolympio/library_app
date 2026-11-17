import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Shelf } from "@/components/bookshelf";
import { useTheme } from "@/hooks/useTheme";
import { useLibrary } from "@/entities/library";
import { getDb } from "@/db";
import {
  hasHardcoverToken,
  loadCatalogDiscovery,
  searchCatalog,
  type CatalogSearchResult,
  type CatalogSnapshot,
} from "@/entities/catalog";
import type { BookshelfBook } from "@/types/bookshelf";
import "@/components/bookshelf/bookshelf.css";
import "./home/home.css";

interface HomeProps { onOpenBook?: (book: BookshelfBook) => void }

type CategoryKind = "spark" | "fantasy" | "science" | "romance" | "mystery" | "ideas" | "children";

const CATEGORIES: Array<{ label: string; query: string; kind: CategoryKind }> = [
  { label: "Em alta", query: "bestsellers", kind: "spark" },
  { label: "Fantasia", query: "subject:fantasy", kind: "fantasy" },
  { label: "Ficção científica", query: "subject:science_fiction", kind: "science" },
  { label: "Romance", query: "subject:romance", kind: "romance" },
  { label: "Mistério", query: "subject:mystery", kind: "mystery" },
  { label: "Ideias", query: "subject:nonfiction", kind: "ideas" },
  { label: "Infantil", query: "subject:juvenile_fiction", kind: "children" },
];

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" /><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function RefreshIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M6.2 8.2A7 7 0 0 1 18.8 7M17.8 15.8A7 7 0 0 1 5.2 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
}

function CategoryIcon({ kind }: { kind: CategoryKind }) {
  const motif = {
    spark: <><path d="m13 3 1.5 4.5L19 9l-4.5 1.5L13 15l-1.5-4.5L7 9l4.5-1.5L13 3Z" /><path d="m6 13 .8 2.2L9 16l-2.2.8L6 19l-.8-2.2L3 16l2.2-.8L6 13Z" /></>,
    fantasy: <><path d="M12 4 7 10l3 1-3 6 6-6-3-1 2-6Z" /><circle cx="16.5" cy="7" r="1.5" /></>,
    science: <><circle cx="12" cy="11" r="2.2" /><path d="M5.5 11c0-2 2.9-3.5 6.5-3.5s6.5 1.5 6.5 3.5-2.9 3.5-6.5 3.5S5.5 13 5.5 11Z" /><path d="M8.8 5.4c1.7-1 4.4 1 6.2 4s2 6.8.3 7.8-4.4-1-6.2-4-2-6.8-.3-7.8Z" /></>,
    romance: <path d="M12 17.8 5.8 12A4 4 0 0 1 11.5 6.4l.5.6.5-.6A4 4 0 0 1 18.2 12L12 17.8Z" />,
    mystery: <><circle cx="10.5" cy="10.5" r="5" /><path d="m14.5 14.5 4 4M10.5 8.3v.1M9.3 10.1c.2-1.5 2.5-1.5 2.5.1 0 1-1.3 1-1.3 2" /></>,
    ideas: <><path d="M8 13.5A5 5 0 1 1 16 13.5c-.9.8-1.3 1.4-1.4 2.5H9.4c-.1-1.1-.5-1.7-1.4-2.5Z" /><path d="M9.5 19h5M10 16h4" /></>,
    children: <><path d="M5 6.5c2.4-.5 4.8.1 7 1.8v10c-2.2-1.7-4.6-2.3-7-1.8v-10ZM19 6.5c-2.4-.5-4.8.1-7 1.8v10c2.2-1.7 4.6-2.3 7-1.8v-10Z" /><path d="m15.5 4 .5 1.3 1.3.5-1.3.5-.5 1.2-.5-1.2-1.3-.5 1.3-.5.5-1.3Z" /></>,
  }[kind];
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{motif}</svg>;
}

function CatalogSkeleton() {
  return (
    <div className="catalog-loading" role="status" aria-label="Montando recomendações">
      {Array.from({ length: 3 }, (_, shelfIndex) => (
        <section className="catalog-loading-shelf" key={shelfIndex}>
          <span className="metadata-shimmer catalog-loading-title" />
          <div className="catalog-loading-books">
            {Array.from({ length: 6 }, (_, bookIndex) => <span className="metadata-shimmer catalog-loading-book" key={bookIndex} />)}
          </div>
        </section>
      ))}
      <span className="sr-only">Buscando o catálogo da Open Library.</span>
    </div>
  );
}

function sourceLabel(source: string): string {
  return source.includes("hardcover") ? "Open Library + Hardcover" : "Open Library";
}

export function Home({ onOpenBook }: HomeProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { entries } = useLibrary();
  const [dbReady, setDbReady] = useState(false);
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<CatalogSearchResult | null>(null);
  const searching = false;
  const [loadingMore, setLoadingMore] = useState(false);

  const loadDiscovery = useCallback(async (forceRefresh = false) => {
    setCatalogError(false);
    forceRefresh ? setRefreshing(true) : setLoading(true);
    try {
      setSnapshot(await loadCatalogDiscovery({ forceRefresh }, (progress) => setSnapshot(progress)));
    } catch {
      setCatalogError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDiscovery();
    if (!("__TAURI_INTERNALS__" in window)) return;
    void getDb().then(() => setDbReady(true)).catch(() => setDbReady(false));
  }, [loadDiscovery]);

  const runSearch = useCallback(async (nextQuery: string) => {
    const normalized = nextQuery.trim();
    if (normalized.length < 2) return;
    navigate(`/catalogo?q=${encodeURIComponent(normalized)}`);
  }, [navigate]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch(query);
  };

  const handleCategory = (nextQuery: string) => {
    const subject = nextQuery.startsWith("subject:") ? nextQuery.slice(8).replaceAll("_", " ") : nextQuery;
    navigate(`/catalogo?q=${encodeURIComponent(subject)}`);
  };

  const handleLoadMore = async () => {
    if (!searchResult || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await searchCatalog(searchResult.query, searchResult.page + 1);
      setSearchResult({ ...next, books: [...searchResult.books, ...next.books] });
    } catch {
      setCatalogError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSearchResult(null);
  };

  return (
    <main className="catalog-page">
      <section className="catalog-hero" aria-labelledby="catalog-title">
        <div className="catalog-hero-copy">
          <p className="catalog-eyebrow">Seu próximo livro já existe</p>
          <h1 id="catalog-title">Encontre a história que vai ficar com você.</h1>
          <p>Capas originais, curadorias vivas e um catálogo mundial organizado como uma livraria feita só para você.</p>
        </div>

        <div className="catalog-hero-search">
          <form className="catalog-search" role="search" onSubmit={handleSearch}>
            <SearchIcon />
            <label className="sr-only" htmlFor="catalog-query">Buscar livros, autores ou ISBN</label>
            <input id="catalog-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Título, autor ou ISBN" minLength={2} autoComplete="off" />
            {searchResult ? <button type="button" className="catalog-search-clear" onClick={clearSearch}>Limpar</button> : null}
            <button type="submit" className="catalog-search-submit" disabled={searching || query.trim().length < 2}>
              {searching ? <span className="catalog-search-spinner" aria-label="Buscando" /> : <><span>Explorar</span><SearchIcon /></>}
            </button>
          </form>
          <div className="catalog-status" aria-label="Status do catálogo">
            <span><i className={dbReady ? "is-ready" : ""} />{dbReady ? "Base local pronta" : "Cache offline ativo"}</span>
            <span>{hasHardcoverToken() ? "Ranking Hardcover ativo" : "Curadoria Open Library"}</span>
            <span>Biblioteca {theme.name}</span>
          </div>
        </div>

        <div className="catalog-hero-books" aria-hidden="true">
          <span className="hero-book hero-book-one"><i /></span>
          <span className="hero-book hero-book-two"><i /></span>
          <span className="hero-book hero-book-three"><i /></span>
          <span className="hero-orbit">
            {theme.id === "mary" ? (
              <svg viewBox="0 0 24 24" className="mary-hero-cat" aria-hidden="true">
                <path d="M5 14V6.5l3.8 2.8a7.4 7.4 0 0 1 6.4 0L19 6.5V14c0 3.6-3.1 6-7 6s-7-2.4-7-6Z" />
                <circle cx="9.5" cy="13" r="1" />
                <circle cx="14.5" cy="13" r="1" />
                <path d="M11 15.2 12 16l1-.8" />
              </svg>
            ) : (
              "∞"
            )}
          </span>
        </div>
      </section>

      <section className="catalog-genres" aria-labelledby="genre-title">
        <div className="catalog-genres-heading"><p>Atalhos de descoberta</p><h2 id="genre-title">Explore por atmosfera</h2></div>
        <div className="catalog-genre-rail">
          {CATEGORIES.map((category) => (
            <button key={category.label} type="button" onClick={() => handleCategory(category.query)} disabled={searching}>
              <span className={`catalog-genre-icon genre-${category.kind}`}><CategoryIcon kind={category.kind} /></span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="catalog-content" className="catalog-content" aria-live="polite">
        {catalogError ? (
          <div className="catalog-error" role="alert">
            <div><strong>O catálogo não pôde ser atualizado.</strong><span>Confira sua conexão. As estantes salvas continuam disponíveis offline.</span></div>
            <button type="button" onClick={() => void loadDiscovery()}>Tentar novamente</button>
          </div>
        ) : null}

        {searchResult ? (
          <div className="catalog-search-results">
            <div className="catalog-section-intro">
              <div><p>Resultados no catálogo mundial</p><h2>“{searchResult.query}”</h2><span>{searchResult.total.toLocaleString("pt-BR")} obras encontradas</span></div>
              <button type="button" onClick={clearSearch}>Voltar às recomendações</button>
            </div>
            <div className="bookshelf-backdrop catalog-single-shelf">
              <Shelf label="Resultados mais relevantes" description="Edições e capas selecionadas pela Open Library" sourceLabel={sourceLabel(searchResult.source)} books={searchResult.books} featured onOpenBook={onOpenBook} />
            </div>
            {searchResult.hasMore ? <button type="button" className="catalog-more" onClick={() => void handleLoadMore()} disabled={loadingMore}>{loadingMore ? "Buscando mais obras…" : "Carregar mais resultados"}</button> : null}
          </div>
        ) : loading && !snapshot ? (
          <CatalogSkeleton />
        ) : snapshot ? (
          <>
            {entries.length > 0 ? <div className="home-personal-section">
              <div className="catalog-section-intro"><div><p>Sua biblioteca</p><h2>{entries.some((entry) => entry.status === "reading") ? "Continue de onde parou" : "Histórias guardadas para você"}</h2><span>Seu espaço pessoal, disponível offline</span></div><button type="button" onClick={() => navigate("/biblioteca")}>Abrir biblioteca</button></div>
              <div className="bookshelf-backdrop"><Shelf label="Sua próxima leitura" description="Livros escolhidos por você" books={entries.slice(0, 12).map((entry) => entry.book)} featured onViewAll={() => navigate("/biblioteca")} onOpenBook={onOpenBook} /></div>
            </div> : null}
            <div className="catalog-section-intro">
              <div><p>Seleção da comunidade</p><h2>Estantes para explorar</h2><span>Um catálogo aberto, preparado para descoberta</span></div>
              <button type="button" className="catalog-refresh" onClick={() => void loadDiscovery(true)} disabled={refreshing}><RefreshIcon />{refreshing ? "Atualizando…" : "Atualizar estantes"}</button>
            </div>
            <div className="bookshelf-backdrop catalog-discovery-shelves">
              {snapshot.shelves.map((shelf, index) => <Shelf key={shelf.id} label={shelf.title} description={shelf.subtitle} sourceLabel={sourceLabel(shelf.source)} books={shelf.books} featured={index === 0} onViewAll={() => navigate(`/catalogo?genero=${encodeURIComponent(shelf.books[0]?.genre ?? "Todos")}`)} onOpenBook={onOpenBook} />)}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
