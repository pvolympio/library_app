import { lazy, Suspense, useEffect, useState } from "react";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ThemeProvider } from "@/themes/ThemeProvider";
import { LibraryProvider, useLibrary, getEpubBinary } from "@/entities/library";
import { recallCatalogBook, rememberCatalogBook } from "@/entities/catalog";
import { ToastProvider } from "@/shared/ui";
import { AppShell } from "@/app/ui/AppShell";
import { Home } from "@/pages/Home";
import { CatalogPage } from "@/pages/catalog";
import { LibraryPage } from "@/pages/library";
import { ALICE_DEMO_BOOK, type ReaderBook } from "@/pages/reader";
import type { BookshelfBook } from "@/types/bookshelf";
import type { ReadingHighlight } from "@/entities/reading-activity";

const ReaderView = lazy(() =>
  import("@/pages/reader").then((module) => ({ default: module.ReaderView })),
);
const AnnotationsPage = lazy(() =>
  import("@/pages/annotations").then((module) => ({ default: module.AnnotationsPage })),
);
const StatisticsPage = lazy(() =>
  import("@/pages/statistics").then((module) => ({ default: module.StatisticsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/settings").then((module) => ({ default: module.SettingsPage })),
);
const BookDetailsPage = lazy(() =>
  import("@/pages/book-details").then((module) => ({ default: module.BookDetailsPage })),
);

const fallback = (
  <div className="product-route-loading" role="status">
    <span className="metadata-shimmer" />
    <p>Preparando sua biblioteca…</p>
  </div>
);

function openBook(navigate: ReturnType<typeof useNavigate>, book: BookshelfBook) {
  rememberCatalogBook(book);
  navigate(`/livro/${encodeURIComponent(book.id)}`, { state: { book } });
}

function HomeRoute() {
  const navigate = useNavigate();
  return <Home onOpenBook={(book) => openBook(navigate, book)} />;
}

function BookRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookId = "" } = useParams();
  const { getEntry } = useLibrary();

  const stateBook = (location.state as { book?: BookshelfBook } | null)?.book;
  const book =
    stateBook ??
    getEntry(decodeURIComponent(bookId))?.book ??
    recallCatalogBook(decodeURIComponent(bookId));

  if (!book) return <Navigate to="/catalogo" replace />;

  return (
    <BookDetailsPage
      book={book}
      onBack={() => navigate(-1)}
      onRead={() =>
        navigate(`/ler/${encodeURIComponent(book.id)}`, { state: { book } })
      }
    />
  );
}

function AnnotationsRoute() {
  const navigate = useNavigate();
  const openHighlight = (highlight: ReadingHighlight) =>
    navigate(
      `/ler/${encodeURIComponent(highlight.bookStorageKey)}?local=${encodeURIComponent(highlight.location)}`,
    );
  return (
    <AnnotationsPage
      onBack={() => navigate(-1)}
      onOpenHighlight={openHighlight}
      onBrowse={() => navigate("/ler/project-gutenberg%3A11")}
    />
  );
}

function ReaderRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { bookId = "" } = useParams();
  const { getEntry } = useLibrary();

  const decodedBookId = decodeURIComponent(bookId);
  const isAlice =
    decodedBookId === "project-gutenberg:11" ||
    decodedBookId.toLowerCase().includes("alice");

  const [readerBook, setReaderBook] = useState<ReaderBook | null>(() =>
    isAlice ? ALICE_DEMO_BOOK : null,
  );
  const [loading, setLoading] = useState(!isAlice);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (isAlice) {
      setReaderBook(ALICE_DEMO_BOOK);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);

    const baseBook =
      (location.state as { book?: BookshelfBook } | null)?.book ??
      getEntry(decodedBookId)?.book ??
      recallCatalogBook(decodedBookId);

    void getEpubBinary(decodedBookId)
      .then((buffer) => {
        if (!active) return;
        if (buffer) {
          setReaderBook({
            storageKey: decodedBookId,
            title: baseBook?.title ?? "Livro Importado",
            author: baseBook?.author ?? "Autor Desconhecido",
            genre: baseBook?.genre ?? "Literatura",
            sourceUrl: buffer,
          });
        } else {
          setLoadError(
            `Nenhum arquivo EPUB vinculado a "${baseBook?.title ?? "este livro"}".`,
          );
        }
      })
      .catch((error: unknown) => {
        console.error("Erro ao carregar EPUB:", error);
        if (active) setLoadError("Falha ao recuperar o arquivo EPUB do armazenamento local.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [decodedBookId, isAlice, location.state, getEntry]);

  if (loading) {
    return (
      <div className="product-route-loading" role="status">
        <span className="metadata-shimmer" />
        <p>Abrindo páginas do livro…</p>
      </div>
    );
  }

  if (loadError || !readerBook) {
    return (
      <main className="reader-fallback-wrapper">
        <div className="reader-fallback-card">
          <div className="reader-fallback-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"
                strokeWidth="1.8"
              />
              <path d="M6 6h10M6 10h10" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="reader-fallback-title">Arquivo EPUB não encontrado</h2>
          <p className="reader-fallback-desc">
            {loadError ??
              "Este livro ainda não possui um arquivo EPUB associado para leitura."}
          </p>
          <div className="reader-fallback-actions">
            <button
              type="button"
              className="reader-fallback-btn-primary"
              onClick={() => navigate(`/livro/${encodeURIComponent(decodedBookId)}`)}
            >
              Vincular EPUB
            </button>
            <button
              type="button"
              className="reader-fallback-btn-secondary"
              onClick={() => navigate(-1)}
            >
              Voltar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <ReaderView
      book={readerBook}
      initialLocation={params.get("local") ?? undefined}
      onClose={() => navigate(-1)}
      onOpenNotes={() => navigate("/anotacoes")}
      onOpenStatistics={() => navigate("/estatisticas")}
    />
  );
}

function SettingsRoute() {
  const navigate = useNavigate();
  return (
    <SettingsPage
      onBack={() => navigate(-1)}
      onOpenReader={() => navigate("/ler/project-gutenberg%3A11")}
    />
  );
}

function StatisticsRoute() {
  const navigate = useNavigate();
  return <StatisticsPage onBack={() => navigate(-1)} />;
}

function ProductRouter() {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomeRoute />} />
          <Route path="catalogo" element={<CatalogPage />} />
          <Route path="biblioteca" element={<LibraryPage />} />
          <Route path="livro/:bookId" element={<BookRoute />} />
          <Route path="anotacoes" element={<AnnotationsRoute />} />
          <Route path="estatisticas" element={<StatisticsRoute />} />
          <Route path="configuracoes" element={<SettingsRoute />} />
        </Route>
        <Route path="ler/:bookId" element={<ReaderRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <LibraryProvider>
          <ToastProvider>
            <ProductRouter />
          </ToastProvider>
        </LibraryProvider>
      </HashRouter>
    </ThemeProvider>
  );
}
