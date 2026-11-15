import { useEffect, useMemo, useState } from "react";
import {
  deleteReadingHighlight,
  listReadingHighlights,
  updateReadingHighlightNote,
  type ReadingHighlight,
} from "@/entities/reading-activity";
import "./annotations.css";

interface AnnotationsPageProps {
  onBack: () => void;
  onOpenHighlight: (highlight: ReadingHighlight) => void;
  onBrowse?: () => void;
}

const timestampFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function markdownForHighlights(highlights: ReadingHighlight[]): string {
  const lines = ["# Minhas Anotações", ""];
  let currentBook = "";
  for (const highlight of highlights) {
    if (highlight.bookTitle !== currentBook) {
      currentBook = highlight.bookTitle;
      lines.push(`## ${currentBook}`, "");
    }
    lines.push(`> *${highlight.excerpt.replace(/\n/g, " ")}*`, "");
    if (highlight.note) lines.push(highlight.note, "");
    lines.push(`_${timestampFormatter.format(new Date(highlight.updatedAt))}_`, "", "---", "");
  }
  return lines.join("\n");
}

function exportMarkdown(highlights: ReadingHighlight[]) {
  const blob = new Blob([markdownForHighlights(highlights)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `minhas-anotacoes-${new Date().toISOString().slice(0, 10)}.md`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AnnotationsPage({ onBack, onOpenHighlight, onBrowse }: AnnotationsPageProps) {
  const [highlights, setHighlights] = useState<ReadingHighlight[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [bookFilter, setBookFilter] = useState("Todos");
  const [editing, setEditing] = useState<ReadingHighlight | null>(null);
  const [draftNote, setDraftNote] = useState("");

  useEffect(() => {
    let active = true;
    void listReadingHighlights()
      .then((items) => {
        if (!active) return;
        setHighlights(items);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        console.error("Falha ao carregar anotações:", error);
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const noteCount = useMemo(
    () => highlights.reduce((count, item) => count + (item.note ? 1 : 0), 0),
    [highlights],
  );
  const books = useMemo(() => ["Todos", ...new Set(highlights.map((item) => item.bookTitle))], [highlights]);
  const filtered = useMemo(() => highlights.filter((item) => (bookFilter === "Todos" || item.bookTitle === bookFilter) && `${item.excerpt} ${item.note ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [bookFilter, highlights, query]);

  return (
    <main className="annotations-page">
      <header className="annotations-header">
        <button type="button" className="annotations-back" onClick={onBack} aria-label="Voltar à biblioteca">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
        </button>
        <div>
          <p>Caderno de leitura</p>
          <h1>Minhas Anotações</h1>
        </div>
        <button
          type="button"
          className="annotations-export"
          onClick={() => exportMarkdown(highlights)}
          disabled={highlights.length === 0}
          aria-label="Exportar anotações em Markdown"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" />
          </svg>
          <span>Exportar</span>
        </button>
      </header>

      <section className="annotations-content" aria-busy={status === "loading"}>
        <div className="annotations-summary">
          <span>{highlights.length} destaques</span>
          <span>{noteCount} notas</span>
        </div>
        {highlights.length > 0 ? <div className="annotations-tools"><label><span className="sr-only">Buscar nas anotações</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar em trechos e notas…" name="annotation-search" autoComplete="off" /></label><label><span className="sr-only">Filtrar por livro</span><select value={bookFilter} onChange={(event) => setBookFilter(event.target.value)}>{books.map((book) => <option key={book}>{book}</option>)}</select></label><span>{filtered.length} resultados</span></div> : null}

        {status === "loading" && <p className="annotations-message">Organizando seus trechos…</p>}
        {status === "error" && <p className="annotations-message">Não foi possível carregar as anotações.</p>}
        {status === "ready" && highlights.length === 0 && (
          <div className="annotations-empty">
            <span aria-hidden="true">“</span>
            <h2>Seu caderno está em branco</h2>
            <p>Selecione um trecho durante a leitura para guardar a primeira ideia.</p>
            {onBrowse ? <button type="button" onClick={onBrowse}>Abrir uma leitura</button> : null}
          </div>
        )}

        {highlights.length > 0 && (
          <div className="annotations-list">
            {filtered.map((highlight) => (
              <article
                key={highlight.id}
                className="annotation-item"
                style={{ "--annotation-color": highlight.color } as React.CSSProperties}
              >
                <span className="annotation-book">{highlight.bookTitle}</span>
                <time dateTime={highlight.updatedAt}>{timestampFormatter.format(new Date(highlight.updatedAt))}</time>
                <blockquote>{highlight.excerpt}</blockquote>
                {highlight.note && <p>{highlight.note}</p>}
                <div className="annotation-actions"><button type="button" onClick={() => onOpenHighlight(highlight)}>Ir para o trecho</button><button type="button" onClick={() => { setEditing(highlight); setDraftNote(highlight.note ?? ""); }}>Editar nota</button><button type="button" onClick={() => void deleteReadingHighlight(highlight).then(() => setHighlights((items) => items.filter((item) => item.id !== highlight.id)))}>Excluir</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
      {editing ? <div className="annotation-dialog-layer"><button type="button" className="annotation-dialog-backdrop" aria-label="Fechar editor" onClick={() => setEditing(null)} /><section role="dialog" aria-modal="true" aria-labelledby="annotation-edit-title" className="annotation-dialog"><p>Trecho selecionado</p><h2 id="annotation-edit-title">Editar anotação</h2><blockquote>{editing.excerpt}</blockquote><label htmlFor="annotation-note">Sua nota</label><textarea id="annotation-note" value={draftNote} onChange={(event) => setDraftNote(event.target.value)} rows={5} /><div><button type="button" onClick={() => setEditing(null)}>Cancelar</button><button type="button" onClick={() => void updateReadingHighlightNote(editing, draftNote).then(() => { setHighlights((items) => items.map((item) => item.id === editing.id ? { ...item, note: draftNote.trim() || null } : item)); setEditing(null); })}>Salvar nota</button></div></section></div> : null}
    </main>
  );
}
