import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ManualMetadataField } from "@/entities/book-metadata";
import { BookGridCard, loadCatalogDiscovery, rememberCatalogBook } from "@/entities/catalog";
import { LIBRARY_STATUS_LABEL, useLibrary, type LibraryStatus } from "@/entities/library";
import { useToast } from "@/shared/ui";
import type { BookshelfBook } from "@/types/bookshelf";
import { useBookDetailsMetadata } from "../model/use-book-details-metadata";
import "./book-details.css";
import "@/entities/catalog/ui/book-grid.css";

interface BookDetailsPageProps {
  book: BookshelfBook;
  onBack: () => void;
  onRead?: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `(${Math.round(bytes / 1024)} KB)`;
  return `(${(bytes / (1024 * 1024)).toFixed(1)} MB)`;
}

function PencilMark({
  field,
  manualFields,
}: {
  field: ManualMetadataField;
  manualFields: Set<ManualMetadataField>;
}) {
  if (!manualFields.has(field)) return null;
  return (
    <span
      className="book-detail-manual-mark"
      title="Editado manualmente; não será sobrescrito"
      aria-label="Editado manualmente"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="m3 11.8-.6 2.4 2.4-.6 7.8-7.8-1.8-1.8L3 11.8Zm6.8-6.8 1.8 1.8M10.8 4l1-1a1.3 1.3 0 0 1 1.8 0l.4.4a1.3 1.3 0 0 1 0 1.8l-1.4 1.4" />
      </svg>
    </span>
  );
}

function Rating({
  rating,
  count,
  manualFields,
}: {
  rating: number | null;
  count: number | null;
  manualFields: Set<ManualMetadataField>;
}) {
  const rounded = rating == null ? 0 : Math.round(rating);
  const readable =
    rating == null
      ? "Sem avaliações disponíveis"
      : `${rating.toFixed(1)} de 5, ${count ?? 0} avaliações`;
  return (
    <div className="book-detail-rating" aria-label={readable}>
      <span className="book-detail-stars" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <svg key={index} className={index < rounded ? "is-filled" : ""} viewBox="0 0 24 24">
            <path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3-5.7-3-5.7 3 1.1-6.3-4.6-4.5 6.4-.9L12 2.8Z" />
          </svg>
        ))}
      </span>
      <span>
        {rating == null
          ? "Sem avaliações"
          : `${rating.toFixed(1)} (${(count ?? 0).toLocaleString("pt-BR")})`}
      </span>
      <PencilMark field="rating" manualFields={manualFields} />
    </div>
  );
}

export function BookDetailsPage({ book, onBack, onRead }: BookDetailsPageProps) {
  const navigate = useNavigate();
  const { notify } = useToast();
  const {
    getEntry,
    setStatus,
    toggleFavorite,
    setPersonalRating,
    remove,
    linkEpub,
    removeEpub,
  } = useLibrary();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const entry = getEntry(book.id);
  const { metadata, isLoading, hasError } = useBookDetailsMetadata(book);

  const [coverReady, setCoverReady] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [recommendations, setRecommendations] = useState<BookshelfBook[]>([]);
  const [isLinking, setIsLinking] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const isAlice =
    book.id === "project-gutenberg:11" ||
    book.title.toLocaleLowerCase("pt-BR").includes("alice");
  const hasEpubAvailable = isAlice || Boolean(entry?.book.hasEpub) || Boolean(book.hasEpub);

  const manualFields = useMemo(
    () =>
      new Set<ManualMetadataField>([
        ...(book.manualFields ?? []),
        ...(metadata?.manualFields ?? []),
      ]),
    [book.manualFields, metadata?.manualFields],
  );

  const coverUrl = metadata?.coverUrl ?? book.coverUrl;
  const description =
    metadata?.description ??
    book.description ??
    "Nenhuma descrição foi encontrada para esta edição.";
  const paragraphs = description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const canExpand = paragraphs.length > 3 || description.length > 520;
  const isIncomplete = !isLoading && (hasError || metadata?.status !== "complete");
  const hardcoverRating = book.metadataSource === "hardcover";
  const rating = hardcoverRating
    ? book.averageRating
    : metadata?.averageRating ?? book.averageRating;
  const ratingsCount = hardcoverRating
    ? book.ratingsCount
    : metadata?.ratingsCount ?? book.ratingsCount;

  useEffect(() => {
    setCoverReady(false);
    setCoverFailed(false);
  }, [coverUrl]);

  useEffect(() => {
    let active = true;
    void loadCatalogDiscovery()
      .then((snapshot) => {
        if (!active) return;
        const matching = snapshot.shelves.find((shelf) =>
          shelf.books.some((item) => item.genre === book.genre),
        );
        setRecommendations(
          (matching?.books ?? snapshot.shelves[0]?.books ?? [])
            .filter((item) => item.id !== book.id)
            .slice(0, 5),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [book.genre, book.id]);

  const chooseStatus = async (status: LibraryStatus) => {
    await setStatus(book, status);
    notify(
      status === "reading"
        ? "Livro marcado como leitura atual"
        : `Livro adicionado a “${LIBRARY_STATUS_LABEL[status]}”`,
    );
  };

  const handleRead = async () => {
    await chooseStatus("reading");
    rememberCatalogBook(entry?.book ?? book);
    if (onRead) {
      onRead();
    } else {
      navigate(`/ler/${encodeURIComponent(book.id)}`, {
        state: { book: entry?.book ?? book },
      });
    }
  };

  const handleEpubFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".epub")) {
      notify("Por favor, selecione um arquivo no formato .epub", "error");
      return;
    }
    setIsLinking(true);
    try {
      await linkEpub(book.id, file);
      notify(`Arquivo EPUB "${file.name}" vinculado com sucesso!`);
    } catch (err) {
      console.error(err);
      notify("Falha ao vincular o arquivo EPUB.", "error");
    } finally {
      setIsLinking(false);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      await handleEpubFile(file);
    }
  };

  const openRecommendation = (nextBook: BookshelfBook) => {
    rememberCatalogBook(nextBook);
    navigate(`/livro/${encodeURIComponent(nextBook.id)}`, { state: { book: nextBook } });
  };

  return (
    <main className="book-detail-page">
      <header className="book-detail-header">
        <button type="button" onClick={onBack} aria-label="Voltar à biblioteca">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 5-7 7 7 7" />
          </svg>
        </button>
        <div>
          <p>Ficha do acervo</p>
          <h1>Detalhes do livro</h1>
        </div>
      </header>

      <article
        className="book-detail-content"
        aria-labelledby="book-detail-title"
        aria-busy={isLoading}
      >
        <div className="book-detail-cover-column">
          <div className="book-detail-cover-frame">
            {(isLoading || !coverReady) && !coverFailed && (
              <div
                className="metadata-shimmer book-detail-cover-skeleton"
                aria-hidden="true"
              />
            )}
            {coverFailed ? (
              <div
                className="book-detail-cover-fallback"
                role="img"
                aria-label={`Capa indisponível de ${book.title}`}
              >
                <span>{book.title.slice(0, 1)}</span>
              </div>
            ) : (
              <img
                className={
                  !isLoading && coverReady
                    ? "metadata-fade-in"
                    : "book-detail-cover-pending"
                }
                src={coverUrl}
                alt={`Capa de ${book.title}`}
                width="400"
                height="600"
                onLoad={() => setCoverReady(true)}
                onError={() => {
                  setCoverReady(true);
                  setCoverFailed(true);
                }}
              />
            )}
            {isIncomplete && (
              <span className="book-detail-incomplete-badge">Metadata incompleta</span>
            )}
            <PencilMark field="cover" manualFields={manualFields} />
          </div>
          {book.isbn && <p className="book-detail-isbn">ISBN {book.isbn}</p>}
        </div>

        <div className="book-detail-information">
          <div className="book-detail-title-line">
            <h2 id="book-detail-title">{book.title}</h2>
            <PencilMark field="title" manualFields={manualFields} />
          </div>
          <p className="book-detail-author">
            {book.author}
            <PencilMark field="author" manualFields={manualFields} />
          </p>
          <div className="book-detail-genre-line">
            <span>{book.genre}</span>
            {book.isbn ? <span>ISBN {book.isbn}</span> : null}
          </div>
          <div className="book-detail-catalog-meta">
            {book.firstPublishYear ? (
              <span>Primeira publicação: {book.firstPublishYear}</span>
            ) : null}
            <span>
              {book.metadataSource === "local"
                ? "Arquivo local importado"
                : hardcoverRating
                  ? "Open Library + Hardcover"
                  : "Open Library"}
            </span>
          </div>

          {isLoading ? (
            <div
              className="book-detail-description-skeleton"
              aria-label="Buscando descrição"
              role="status"
            >
              <span className="metadata-shimmer" />
              <span className="metadata-shimmer" />
              <span className="metadata-shimmer" />
            </div>
          ) : (
            <div className="metadata-fade-in">
              <Rating
                rating={rating ?? null}
                count={ratingsCount ?? null}
                manualFields={manualFields}
              />
              <section
                className="book-detail-description-section"
                aria-labelledby="book-detail-description-heading"
              >
                <div className="book-detail-section-heading">
                  <h3 id="book-detail-description-heading">Descrição</h3>
                  <PencilMark field="description" manualFields={manualFields} />
                </div>
                <div className="book-detail-description" data-expanded={expanded}>
                  {paragraphs.map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 24)}-${index}`}>{paragraph}</p>
                  ))}
                </div>
                {canExpand && (
                  <button
                    type="button"
                    className="book-detail-read-more"
                    onClick={() => setExpanded((value) => !value)}
                    aria-expanded={expanded}
                  >
                    {expanded ? "Mostrar menos" : "Ler mais"}
                  </button>
                )}
              </section>
            </div>
          )}

          <section className="book-detail-actions" aria-label="Ações do livro">
            {/* Input oculto para selecionar EPUB nativamente */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".epub,application/epub+zip"
              className="sr-only"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleEpubFile(file);
                e.target.value = "";
              }}
            />

            <div className="book-detail-primary-actions">
              {hasEpubAvailable ? (
                <button
                  type="button"
                  className="book-detail-read-action"
                  onClick={() => void handleRead()}
                >
                  {entry?.status === "reading" ? "Continuar lendo" : "Ler agora"}
                </button>
              ) : (
                <button
                  type="button"
                  className="book-detail-read-action book-detail-link-btn"
                  onClick={() =>
                    navigate(`/catalogo?aba=online&q=${encodeURIComponent(book.title)}`)
                  }
                >
                  Buscar EPUB para Ler
                </button>
              )}
              <button
                type="button"
                className={`book-detail-favorite${entry?.favorite ? " is-active" : ""}`}
                aria-pressed={entry?.favorite ?? false}
                onClick={async () => {
                  await toggleFavorite(book);
                  notify(
                    entry?.favorite ? "Removido dos favoritos" : "Adicionado aos favoritos",
                  );
                }}
                aria-label={
                  entry?.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"
                }
              >
                ♡
              </button>
            </div>

            {/* Painel de status e vinculação do EPUB */}
            <div className="book-detail-epub-panel">
              {hasEpubAvailable ? (
                <div className="book-detail-epub-card is-active">
                  <div className="book-detail-epub-icon">✓</div>
                  <div className="book-detail-epub-text">
                    <strong>Arquivo EPUB pronto para leitura</strong>
                    <span>
                      {isAlice
                        ? "Edição clássica de demonstração embutida"
                        : `${entry?.book.fileName ?? "Arquivo vinculado"} ${formatFileSize(entry?.book.fileSize || book.fileSize)}`}
                    </span>
                  </div>
                  {!isAlice && (
                    <div className="book-detail-epub-tools">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Substituir por outra edição do EPUB"
                      >
                        Substituir
                      </button>
                      <button
                        type="button"
                        className="is-danger"
                        onClick={async () => {
                          await removeEpub(book.id);
                          notify("Arquivo EPUB desvinculado", "info");
                        }}
                        title="Desvincular arquivo"
                      >
                        Desvincular
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className={`book-detail-epub-dropzone${isDraggingOver ? " is-over" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path
                      d="M12 4v12m0-12 4 4m-4-4L8 8m-4 12h16"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div>
                    <p>
                      {isLinking ? "Processando arquivo…" : "Arraste um arquivo "}
                      <strong>.epub</strong> aqui para ler
                    </p>
                    <span>ou clique para selecionar do seu computador</span>
                  </div>
                </div>
              )}
            </div>

            <div className="book-detail-status-control" aria-label="Estado na biblioteca">
              {(["want-to-read", "reading", "completed"] as LibraryStatus[]).map(
                (status) => (
                  <button
                    type="button"
                    key={status}
                    aria-pressed={entry?.status === status}
                    onClick={() => void chooseStatus(status)}
                  >
                    {LIBRARY_STATUS_LABEL[status]}
                  </button>
                ),
              )}
              {entry ? (
                <button
                  type="button"
                  className="book-detail-remove"
                  onClick={async () => {
                    await remove(book.id);
                    notify("Livro removido da sua biblioteca", "info");
                  }}
                >
                  Remover
                </button>
              ) : null}
            </div>

            <div className="book-detail-personal-rating">
              <span>Sua avaliação</span>
              <div>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    type="button"
                    key={value}
                    className={(entry?.personalRating ?? 0) >= value ? "is-filled" : ""}
                    onClick={async () => {
                      await setPersonalRating(book, value);
                      notify("Sua avaliação foi salva");
                    }}
                    aria-label={`Avaliar com ${value} estrelas`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </article>

      {recommendations.length ? (
        <section className="book-detail-related">
          <div>
            <p>Próximas descobertas</p>
            <h2>Leitores deste livro também exploram</h2>
          </div>
          <div className="book-grid">
            {recommendations.map((item) => (
              <BookGridCard key={item.id} book={item} onOpen={openRecommendation} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
