import { useLayoutEffect, useRef, useState } from "react";
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
} from "@/entities/reading-activity";
import type { EpubTextSelection } from "../model/epub-reader";

interface HighlightToolbarProps {
  selection: EpubTextSelection;
  onHighlight: (color: HighlightColor) => void;
  onSaveNote: (note: string) => void;
  onDismiss: () => void;
}

interface MenuPosition { left: number; top: number }

export function HighlightToolbar({
  selection,
  onHighlight,
  onSaveNote,
  onDismiss,
}: HighlightToolbarProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [position, setPosition] = useState<MenuPosition>({
    left: selection.anchorX,
    top: selection.top,
  });

  useLayoutEffect(() => {
    const reposition = () => {
      const menu = menuRef.current;
      if (!menu) return;
      const gap = 10;
      const edge = 12;
      const { width, height } = menu.getBoundingClientRect();
      const maxLeft = Math.max(edge, window.innerWidth - width - edge);
      const maxTop = Math.max(edge, window.innerHeight - height - edge);
      const preferredTop = selection.top - height - gap;
      const fallbackTop = selection.bottom + gap;
      setPosition({
        left: Math.min(maxLeft, Math.max(edge, selection.anchorX - width / 2)),
        top: Math.min(maxTop, Math.max(edge, preferredTop >= edge ? preferredTop : fallbackTop)),
      });
    };
    reposition();
    window.addEventListener("resize", reposition);
    return () => window.removeEventListener("resize", reposition);
  }, [noteOpen, selection]);

  return (
    <div
      ref={menuRef}
      className="reader-highlight-toolbar"
      style={{ left: position.left, top: position.top }}
      role="dialog"
      aria-label="Destacar trecho selecionado"
    >
      {noteOpen ? (
        <form
          className="reader-note-composer"
          onSubmit={(event) => {
            event.preventDefault();
            const content = note.trim();
            if (content) onSaveNote(content);
          }}
        >
          <label htmlFor="reader-selection-note">Anotação</label>
          <textarea
            id="reader-selection-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="O que você quer lembrar?"
            rows={3}
            autoFocus
          />
          <div>
            <button type="button" onClick={() => setNoteOpen(false)}>Voltar</button>
            <button type="submit" disabled={!note.trim()}>Salvar nota</button>
          </div>
        </form>
      ) : (
        <>
          <div className="reader-highlight-colors" aria-label="Cor do destaque">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                className="reader-highlight-color"
                style={{ backgroundColor: color.value }}
                aria-label={`Destacar em ${color.label.toLowerCase()}`}
                onClick={() => onHighlight(color.value)}
              />
            ))}
          </div>
          <span className="reader-highlight-divider" aria-hidden="true" />
          <button
            type="button"
            className="reader-highlight-note"
            aria-label="Adicionar anotação"
            onClick={() => setNoteOpen(true)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m4 20 4.2-1 10.6-10.6a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
              <path d="m14.8 6.4 2.8 2.8" />
            </svg>
          </button>
          <button
            type="button"
            className="reader-highlight-dismiss"
            aria-label="Fechar menu de destaque"
            onClick={onDismiss}
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}
