import { AnimatePresence, motion } from "framer-motion";
import "@fontsource/cormorant-garamond/latin-600.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/lora/latin-400.css";
import "@fontsource/quicksand/latin-400.css";
import "@fontsource/quicksand/latin-600.css";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  createReadingHighlight,
  listReadingHighlights,
  markBookCompleted,
  useReadingSession,
  type HighlightColor,
  type ReadingHighlight,
} from "@/entities/reading-activity";
import { useEpubReader } from "../model/epub-reader";
import {
  ALICE_DEMO_BOOK,
  DEFAULT_READER_PREFERENCES,
  FONT_OPTIONS,
  FONT_SIZES,
  LINE_HEIGHT_OPTIONS,
  MARGIN_OPTIONS,
  READER_PREFERENCES_STORAGE_KEY,
  type ReaderBook,
  type ReaderPreferences,
} from "../model/reader-preferences";
import {
  DEFAULT_READING_THEME_SETTINGS,
  presetIdForGenre,
  resolveReadingPreset,
  type ReadingThemeSettings,
} from "../model/reading-themes";
import {
  loadReadingThemeSettings,
  saveReadingThemeSettings,
} from "../model/reading-theme-storage";
import { ReaderControls } from "./ReaderControls";
import { HighlightToolbar } from "./HighlightToolbar";
import "./reader.css";

interface ReaderViewProps {
  book?: ReaderBook;
  initialLocation?: string;
  onOpenNotes?: () => void;
  onOpenStatistics?: () => void;
  onClose: () => void;
}

type TurnDirection = "next" | "previous" | null;
type ReaderStyle = CSSProperties & Record<`--reader-${string}`, string>;
interface ThemeCrossfade {
  key: number;
  background: string;
}

function loadPreferences(): ReaderPreferences {
  try {
    const stored = window.localStorage.getItem(READER_PREFERENCES_STORAGE_KEY);
    if (!stored) return DEFAULT_READER_PREFERENCES;

    const candidate = JSON.parse(stored) as Partial<ReaderPreferences>;
    return {
      fontSize: FONT_SIZES.includes(candidate.fontSize as (typeof FONT_SIZES)[number])
        ? (candidate.fontSize as number)
        : DEFAULT_READER_PREFERENCES.fontSize,
      font: FONT_OPTIONS.some((option) => option.id === candidate.font)
        ? (candidate.font as ReaderPreferences["font"])
        : DEFAULT_READER_PREFERENCES.font,
      lineHeight: LINE_HEIGHT_OPTIONS.some((option) => option.value === candidate.lineHeight)
        ? (candidate.lineHeight as ReaderPreferences["lineHeight"])
        : DEFAULT_READER_PREFERENCES.lineHeight,
      margin: MARGIN_OPTIONS.some((option) => option.value === candidate.margin)
        ? (candidate.margin as ReaderPreferences["margin"])
        : DEFAULT_READER_PREFERENCES.margin,
      flow:
        candidate.flow === "paginated" || candidate.flow === "scrolled"
          ? candidate.flow
          : DEFAULT_READER_PREFERENCES.flow,
      brightness:
        typeof candidate.brightness === "number" &&
        candidate.brightness >= 0.7 &&
        candidate.brightness <= 1.15
          ? candidate.brightness
          : DEFAULT_READER_PREFERENCES.brightness,
    };
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

export function ReaderView({
  book = ALICE_DEMO_BOOK,
  initialLocation,
  onOpenNotes,
  onOpenStatistics,
  onClose,
}: ReaderViewProps) {
  const [preferences, setPreferences] = useState<ReaderPreferences>(loadPreferences);
  const [themeSettings, setThemeSettings] = useState<ReadingThemeSettings>(() => ({
    ...DEFAULT_READING_THEME_SETTINGS,
    manualPresetId: presetIdForGenre(book.genre),
  }));
  const [themeSettingsLoaded, setThemeSettingsLoaded] = useState(false);
  const [themeCrossfade, setThemeCrossfade] = useState<ThemeCrossfade | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [turnDirection, setTurnDirection] = useState<TurnDirection>(null);
  const [highlights, setHighlights] = useState<ReadingHighlight[]>([]);
  const hideChromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsTriggerRef = useRef<HTMLButtonElement>(null);
  const controlsOpenRef = useRef(controlsOpen);
  const previousThemeRef = useRef(resolveReadingPreset(book.genre, themeSettings));
  const crossfadeSequenceRef = useRef(0);
  const completionRecordedRef = useRef(false);

  controlsOpenRef.current = controlsOpen;

  const revealChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);

    if (!controlsOpenRef.current) {
      hideChromeTimer.current = setTimeout(() => setChromeVisible(false), 2200);
    }
  }, []);

  const activeTheme = useMemo(
    () => resolveReadingPreset(book.genre, themeSettings),
    [book.genre, themeSettings],
  );

  const recordPage = useReadingSession(book);

  const {
    containerRef,
    progress,
    chapter,
    isReady,
    error,
    next,
    previous,
    selection,
    dismissSelection,
    navigation,
    currentLocation,
    displayLocation,
    search,
  } = useEpubReader(
    book,
    preferences,
    activeTheme,
    revealChrome,
    highlights,
    recordPage,
    initialLocation,
  );

  const readerStyle = useMemo<ReaderStyle>(
    () => ({
      "--reader-background": activeTheme.background,
      "--reader-foreground": activeTheme.foreground,
      "--reader-accent": activeTheme.accent,
      "--reader-accent-secondary": activeTheme.secondaryAccent ?? activeTheme.accent,
      "--reader-ui-radius": `${activeTheme.uiRadius}px`,
      "--reader-heading-font": activeTheme.headingFont ?? "Inter, sans-serif",
      "--reader-body-font": activeTheme.bodyFont ?? "Inter, sans-serif",
      "--reader-brightness": String(preferences.brightness),
    }),
    [activeTheme],
  );

  const turnPage = useCallback(
    async (direction: Exclude<TurnDirection, null>) => {
      if (!isReady || preferences.flow !== "paginated" || turnDirection) return;

      if (turnTimer.current) clearTimeout(turnTimer.current);
      setTurnDirection(direction);

      try {
        await (direction === "next" ? next() : previous());
      } finally {
        turnTimer.current = setTimeout(() => setTurnDirection(null), 400);
      }
    }, [isReady, next, preferences.flow, previous, turnDirection],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(
        READER_PREFERENCES_STORAGE_KEY,
        JSON.stringify(preferences),
      );
    } catch {
      // Preferências voltam ao padrão se o armazenamento estiver bloqueado.
    }
  }, [preferences]);

  useEffect(() => {
    let active = true;
    void listReadingHighlights(book)
      .then((saved) => {
        if (active) setHighlights(saved);
      })
      .catch((reason: unknown) => console.error("Falha ao restaurar destaques:", reason));
    return () => {
      active = false;
    };
  }, [book]);

  useEffect(() => {
    completionRecordedRef.current = false;
  }, [book]);

  useEffect(() => {
    if (progress < 0.995 || completionRecordedRef.current) return;
    completionRecordedRef.current = true;
    void markBookCompleted(book).catch((reason: unknown) => {
      completionRecordedRef.current = false;
      console.error("Falha ao registrar conclusão do livro:", reason);
    });
  }, [book, progress]);

  useEffect(() => {
    let active = true;
    setThemeSettingsLoaded(false);

    void loadReadingThemeSettings(book)
      .then((saved) => {
        if (!active) return;
        setThemeSettings(
          saved ?? {
            automaticByGenre: true,
            manualPresetId: presetIdForGenre(book.genre),
          },
        );
        setThemeSettingsLoaded(true);
      })
      .catch((reason: unknown) => {
        console.error("Falha ao restaurar o tema de leitura:", reason);
        if (active) setThemeSettingsLoaded(true);
      });

    return () => {
      active = false;
    };
  }, [book]);

  useEffect(() => {
    if (themeSettingsLoaded) saveReadingThemeSettings(book, themeSettings);
  }, [book, themeSettings, themeSettingsLoaded]);

  useEffect(() => {
    const previousTheme = previousThemeRef.current;
    if (previousTheme.id !== activeTheme.id) {
      crossfadeSequenceRef.current += 1;
      setThemeCrossfade({
        key: crossfadeSequenceRef.current,
        background: previousTheme.background,
      });
      previousThemeRef.current = activeTheme;
    }
  }, [activeTheme]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    revealChrome();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
      if (turnTimer.current) clearTimeout(turnTimer.current);
    };
  }, [revealChrome]);

  useEffect(() => {
    if (controlsOpen) {
      setChromeVisible(true);
      if (hideChromeTimer.current) clearTimeout(hideChromeTimer.current);
    } else {
      revealChrome();
    }
  }, [controlsOpen, revealChrome]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (controlsOpen) setControlsOpen(false);
        else onClose();
        return;
      }

      if (preferences.flow !== "paginated") return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        void turnPage("next");
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        void turnPage("previous");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controlsOpen, onClose, preferences.flow, turnPage]);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.clientY <= 76) revealChrome();
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" && event.clientY <= 92) revealChrome();
  };

  const saveSelection = useCallback(
    async (color: HighlightColor, note?: string) => {
      if (!selection) return;
      try {
        const created = await createReadingHighlight(book, {
          location: selection.cfiRange,
          excerpt: selection.text,
          color,
          note,
        });
        setHighlights((current) => [created, ...current]);
        dismissSelection();
      } catch (reason) {
        console.error("Falha ao salvar destaque:", reason);
      }
    },
    [book, dismissSelection, selection],
  );

  const percentageLabel = Math.round(progress * 100);
  const minutesRemaining = Math.max(1, Math.round((1 - progress) * 240));
  const bookmarkKey = `library-app:bookmark:${book.storageKey}`;
  const [bookmarkLocation, setBookmarkLocation] = useState<string | null>(() => {
    try {
      return window.localStorage.getItem(`library-app:bookmark:${book.storageKey}`);
    } catch {
      return null;
    }
  });
  const bookmarked = Boolean(currentLocation && bookmarkLocation === currentLocation);
  const turnClass = turnDirection ? `reader-book-stage--turn-${turnDirection}` : "";

  const closeControls = useCallback(() => {
    setControlsOpen(false);
    window.requestAnimationFrame(() => controlsTriggerRef.current?.focus());
  }, []);

  const toggleBookmark = useCallback(() => {
    if (!currentLocation) return;
    try {
      if (bookmarked) {
        window.localStorage.removeItem(bookmarkKey);
        setBookmarkLocation(null);
      } else {
        window.localStorage.setItem(bookmarkKey, currentLocation);
        setBookmarkLocation(currentLocation);
      }
    } catch {
      // O leitor segue funcional quando o armazenamento está bloqueado.
    }
  }, [bookmarked, bookmarkKey, currentLocation]);

  return (
    <main
      className="reader-view"
      style={readerStyle}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-reader-theme={activeTheme.id}
    >
      {activeTheme.textureUrl && (
        <div
          className="reader-theme-texture"
          style={{
            backgroundImage: `url(${activeTheme.textureUrl})`,
            opacity: activeTheme.textureOpacity,
          }}
          aria-hidden="true"
        />
      )}
      {activeTheme.vignette && (
        <div
          className="reader-theme-vignette"
          style={{ background: activeTheme.vignette }}
          aria-hidden="true"
        />
      )}

      <AnimatePresence>
        {themeCrossfade && (
          <motion.div
            key={themeCrossfade.key}
            className="reader-theme-crossfade"
            style={{ background: themeCrossfade.background }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            onAnimationComplete={() =>
              setThemeCrossfade((current) =>
                current?.key === themeCrossfade.key ? null : current,
              )
            }
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(chromeVisible || controlsOpen) && (
          <motion.header
            className="reader-topbar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              className="reader-close-button"
              aria-label="Fechar livro"
              onClick={onClose}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <p title={`${book.title}, de ${book.author}`}>{book.title}</p>
            <button
              type="button"
              className="reader-icon-button reader-bookmark-button"
              aria-label={bookmarked ? "Remover marcador" : "Marcar esta posição"}
              aria-pressed={bookmarked}
              disabled={!currentLocation}
              onClick={toggleBookmark}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4h10v16l-5-3-5 3z" />
              </svg>
            </button>
          </motion.header>
        )}
      </AnimatePresence>

      <section
        className={["reader-book-stage", turnClass].filter(Boolean).join(" ")}
        aria-label={`Leitura de ${book.title}`}
      >
        <div ref={containerRef} className="reader-epub-container" />
      </section>

      {preferences.flow === "paginated" && isReady && (
        <nav className="reader-page-navigation" aria-label="Navegação de páginas">
          <button
            type="button"
            className="reader-page-button reader-page-button--previous"
            aria-label="Página anterior"
            onClick={() => void turnPage("previous")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            className="reader-page-button reader-page-button--next"
            aria-label="Próxima página"
            onClick={() => void turnPage("next")}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>
        </nav>
      )}

      <button
        ref={controlsTriggerRef}
        type="button"
        className="reader-controls-trigger"
        aria-label="Abrir controles de leitura"
        aria-expanded={controlsOpen}
        onClick={() => setControlsOpen(true)}
      >
        Aa
      </button>

      {selection && (
        <HighlightToolbar
          selection={selection}
          onHighlight={(color) => void saveSelection(color)}
          onSaveNote={(note) => void saveSelection("#FFE066", note)}
          onDismiss={dismissSelection}
        />
      )}

      <p className="reader-location" aria-live="polite">
        Capítulo {chapter} · {percentageLabel}% · cerca de {minutesRemaining} min
      </p>

      <div className="reader-progress-track" aria-hidden="true">
        <motion.div
          className="reader-progress-value"
          animate={{ scaleX: progress }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </div>

      <AnimatePresence>
        {!isReady && !error && (
          <motion.div
            className="reader-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
          >
            <span className="reader-loading-mark" aria-hidden="true" />
            <span>Abrindo o livro…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="reader-error" role="alert">
          <strong>O livro não abriu</strong>
          <span>{error}</span>
          <button type="button" onClick={onClose}>
            Voltar à biblioteca
          </button>
        </div>
      )}

      <ReaderControls
        open={controlsOpen}
        preferences={preferences}
        themeSettings={themeSettings}
        activeTheme={activeTheme}
        onChange={setPreferences}
        onThemeChange={setThemeSettings}
        onOpenNotes={onOpenNotes}
        onOpenStatistics={onOpenStatistics}
        navigation={navigation}
        bookmarkLocation={bookmarkLocation}
        onOpenBookmark={() => {
          if (bookmarkLocation) void displayLocation(bookmarkLocation);
          closeControls();
        }}
        onNavigate={(location) => {
          void displayLocation(location);
          closeControls();
        }}
        onSearch={search}
        onClose={closeControls}
      />
    </main>
  );
}
