import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EpubNavigationItem, EpubSearchResult } from "../model/epub-reader";
import {
  FONT_OPTIONS,
  FONT_SIZES,
  LINE_HEIGHT_OPTIONS,
  MARGIN_OPTIONS,
  type ReaderPreferences,
} from "../model/reader-preferences";
import {
  READING_THEME_PRESETS,
  type ReadingThemePreset,
  type ReadingThemeSettings,
} from "../model/reading-themes";

interface ReaderControlsProps {
  open: boolean;
  preferences: ReaderPreferences;
  themeSettings: ReadingThemeSettings;
  activeTheme: ReadingThemePreset;
  onChange: (preferences: ReaderPreferences) => void;
  onThemeChange: (settings: ReadingThemeSettings) => void;
  onOpenNotes?: () => void;
  onOpenStatistics?: () => void;
  navigation: EpubNavigationItem[];
  bookmarkLocation: string | null;
  onOpenBookmark: () => void;
  onNavigate: (location: string) => void;
  onSearch: (query: string) => Promise<EpubSearchResult[]>;
  onClose: () => void;
}

function useMobilePanel(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

export function ReaderControls({
  open,
  preferences,
  themeSettings,
  activeTheme,
  onChange,
  onThemeChange,
  onOpenNotes,
  onOpenStatistics,
  navigation,
  bookmarkLocation,
  onOpenBookmark,
  onNavigate,
  onSearch,
  onClose,
}: ReaderControlsProps) {
  const isMobile = useMobilePanel();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EpubSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const fontSizeIndex = FONT_SIZES.indexOf(
    preferences.fontSize as (typeof FONT_SIZES)[number],
  );

  const update = <Key extends keyof ReaderPreferences>(
    key: Key,
    value: ReaderPreferences[Key],
  ) => onChange({ ...preferences, [key]: value });

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => document.removeEventListener("keydown", trapFocus);
  }, [onClose, open]);

  const submitSearch = async (event: FormEvent) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      setResults(await onSearch(query));
    } finally {
      setSearching(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="reader-controls-layer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            className="reader-panel-backdrop"
            aria-label="Fechar controles de leitura"
            onClick={onClose}
          />

          <motion.aside
            ref={panelRef}
            className="reader-settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reader-settings-title"
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 330, damping: 34 }}
          >
            <div className="reader-sheet-handle" aria-hidden="true" />

            <div className="reader-settings-header">
              <div>
                <p className="reader-settings-eyebrow">Conforto de leitura</p>
                <h2 id="reader-settings-title">Aparência</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="reader-icon-button"
                aria-label="Fechar controles"
                onClick={onClose}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            <div className="reader-settings-scroll">
              <section className="reader-content-tools" aria-labelledby="reader-content-title">
                <button
                  type="button"
                  className="reader-content-toggle"
                  aria-expanded={contentsOpen}
                  aria-controls="reader-content-panel"
                  onClick={() => setContentsOpen((current) => !current)}
                >
                  <span>
                    <strong id="reader-content-title">Conteúdo do livro</strong>
                    <small>Sumário e busca dentro do EPUB</small>
                  </span>
                  <span aria-hidden="true">{contentsOpen ? "−" : "+"}</span>
                </button>
                {contentsOpen && (
                  <div id="reader-content-panel" className="reader-content-panel">
                    {bookmarkLocation && (
                      <button type="button" className="reader-saved-bookmark" onClick={onOpenBookmark}>
                        <span aria-hidden="true">◆</span> Ir para o marcador salvo
                      </button>
                    )}
                    <form className="reader-book-search" role="search" onSubmit={submitSearch}>
                      <label className="reader-visually-hidden" htmlFor="reader-book-search">Buscar no livro</label>
                      <input
                        id="reader-book-search"
                        type="search"
                        value={query}
                        placeholder="Buscar palavra ou trecho"
                        onChange={(event) => setQuery(event.target.value)}
                      />
                      <button type="submit" disabled={searching || query.trim().length < 2}>
                        {searching ? "…" : "Buscar"}
                      </button>
                    </form>
                    {results.length > 0 && (
                      <div className="reader-search-results" aria-live="polite">
                        {results.map((result, index) => (
                          <button key={`${result.cfi}-${index}`} type="button" onClick={() => onNavigate(result.cfi)}>
                            {result.excerpt.replace(/\s+/g, " ").trim()}
                          </button>
                        ))}
                      </div>
                    )}
                    {results.length === 0 && query && !searching && (
                      <p className="reader-search-empty">Use a busca ou escolha um capítulo.</p>
                    )}
                    <nav className="reader-toc" aria-label="Sumário do livro">
                      {navigation.map((item, index) => (
                        <button key={`${item.href}-${index}`} type="button" onClick={() => onNavigate(item.href)}>
                          <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}
              </section>
              {(onOpenNotes || onOpenStatistics) && (
                <nav className="reader-library-links" aria-label="Dados de leitura">
                  {onOpenNotes && (
                    <button type="button" onClick={onOpenNotes}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
                      </svg>
                      Anotações
                    </button>
                  )}
                  {onOpenStatistics && (
                    <button type="button" onClick={onOpenStatistics}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 19V9M12 19V5M19 19v-7" />
                      </svg>
                      Estatísticas
                    </button>
                  )}
                </nav>
              )}
              <fieldset className="reader-control-group">
                <legend>Tamanho do texto</legend>
                <div className="reader-font-size-row">
                  <span
                    className="reader-font-preview"
                    style={{ fontSize: preferences.fontSize }}
                    aria-hidden="true"
                  >
                    Aa
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={FONT_SIZES.length - 1}
                    step={1}
                    value={Math.max(0, fontSizeIndex)}
                    aria-label="Tamanho do texto"
                    aria-valuetext={`${preferences.fontSize}px`}
                    onChange={(event) =>
                      update("fontSize", FONT_SIZES[Number(event.target.value)])
                    }
                  />
                  <span className="reader-control-value">{preferences.fontSize}px</span>
                </div>
              </fieldset>

              <fieldset className="reader-control-group">
                <legend>Brilho da página</legend>
                <div className="reader-font-size-row reader-brightness-row">
                  <span aria-hidden="true">☼</span>
                  <input
                    type="range"
                    min={70}
                    max={115}
                    step={5}
                    value={Math.round(preferences.brightness * 100)}
                    aria-label="Brilho da página"
                    aria-valuetext={`${Math.round(preferences.brightness * 100)}%`}
                    onChange={(event) => update("brightness", Number(event.target.value) / 100)}
                  />
                  <span className="reader-control-value">{Math.round(preferences.brightness * 100)}%</span>
                </div>
              </fieldset>

              <fieldset className="reader-control-group">
                <legend>Fonte</legend>
                <div className="reader-font-options">
                  {FONT_OPTIONS.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      className="reader-font-option"
                      data-active={preferences.font === font.id}
                      aria-pressed={preferences.font === font.id}
                      aria-label={font.label}
                      onClick={() => update("font", font.id)}
                    >
                      <span style={{ fontFamily: font.family }}>Aa</span>
                      <small>{font.label}</small>
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="reader-control-group">
                <legend>Espaçamento entre linhas</legend>
                <div className="reader-segmented-control">
                  {LINE_HEIGHT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      data-active={preferences.lineHeight === option.value}
                      aria-pressed={preferences.lineHeight === option.value}
                      onClick={() => update("lineHeight", option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="reader-control-group">
                <legend>Margens</legend>
                <div className="reader-segmented-control">
                  {MARGIN_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      data-active={preferences.margin === option.value}
                      aria-pressed={preferences.margin === option.value}
                      onClick={() => update("margin", option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <section className="reader-control-group reader-theme-control" aria-labelledby="reading-theme-label">
                <div className="reader-theme-heading">
                  <div>
                    <h3 id="reading-theme-label">Tema por gênero</h3>
                    <p>{themeSettings.automaticByGenre ? activeTheme.label : "Escolha manual"}</p>
                  </div>
                  <button
                    type="button"
                    className="reader-switch"
                    role="switch"
                    aria-checked={themeSettings.automaticByGenre}
                    aria-label="Tema automático por gênero"
                    onClick={() =>
                      onThemeChange({
                        ...themeSettings,
                        automaticByGenre: !themeSettings.automaticByGenre,
                      })
                    }
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>

                <AnimatePresence initial={false}>
                  {!themeSettings.automaticByGenre && (
                    <motion.div
                      className="reader-preset-grid"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.24, ease: "easeOut" }}
                    >
                      {READING_THEME_PRESETS.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          className="reader-preset-card"
                          data-active={themeSettings.manualPresetId === theme.id}
                          aria-pressed={themeSettings.manualPresetId === theme.id}
                          aria-label={theme.label}
                          style={{
                            background: theme.background,
                            color: theme.foreground,
                            borderRadius: theme.uiRadius,
                          }}
                          onClick={() =>
                            onThemeChange({ ...themeSettings, manualPresetId: theme.id })
                          }
                        >
                          <span
                            className="reader-preset-accent"
                            style={{
                              background: theme.secondaryAccent
                                ? `linear-gradient(90deg, ${theme.accent} 0 50%, ${theme.secondaryAccent} 50% 100%)`
                                : theme.accent,
                            }}
                            aria-hidden="true"
                          />
                          <strong>{theme.shortLabel}</strong>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <fieldset className="reader-control-group">
                <legend>Fluxo de leitura</legend>
                <div className="reader-segmented-control reader-flow-control">
                  <button
                    type="button"
                    data-active={preferences.flow === "paginated"}
                    aria-pressed={preferences.flow === "paginated"}
                    onClick={() => update("flow", "paginated")}
                  >
                    Paginado
                  </button>
                  <button
                    type="button"
                    data-active={preferences.flow === "scrolled"}
                    aria-pressed={preferences.flow === "scrolled"}
                    onClick={() => update("flow", "scrolled")}
                  >
                    Scroll contínuo
                  </button>
                </div>
              </fieldset>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
