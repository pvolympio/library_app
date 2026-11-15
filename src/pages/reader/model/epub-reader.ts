import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import ePub, { type Book, type Location, type NavItem, type Rendition } from "epubjs";
import type Contents from "epubjs/types/contents";
import type { ReadingHighlight } from "@/entities/reading-activity";
import {
  getFontOption,
  getMarginPixels,
  type ReaderBook,
  type ReaderPreferences,
} from "./reader-preferences";
import { loadReadingProgress, saveReadingProgress } from "./reading-progress";
import { READING_FONT_ASSETS } from "./reading-fonts";
import {
  READING_THEME_PRESETS,
  type ReadingThemePreset,
} from "./reading-themes";

export interface EpubTextSelection {
  cfiRange: string;
  text: string;
  anchorX: number;
  top: number;
  bottom: number;
}

export interface EpubNavigationItem {
  label: string;
  href: string;
}

export interface EpubSearchResult {
  cfi: string;
  excerpt: string;
}

interface EpubReaderState {
  containerRef: RefObject<HTMLDivElement>;
  progress: number;
  chapter: number;
  isReady: boolean;
  error: string | null;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  selection: EpubTextSelection | null;
  navigation: EpubNavigationItem[];
  currentLocation: string | null;
  dismissSelection: () => void;
  displayLocation: (location: string) => Promise<void>;
  search: (query: string) => Promise<EpubSearchResult[]>;
}

function flattenNavigation(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [
    item,
    ...flattenNavigation(item.subitems ?? []),
  ]);
}

function normalizeHref(href: string): string {
  return decodeURIComponent(href.split("#")[0]).replace(/^\.\//, "");
}

function chapterNumberForLocation(location: Location, navigation: NavItem[]): number {
  const href = normalizeHref(location.start.href);
  const explicitChapters = navigation.filter((item) => /chapter\s+[\divxlcdm]+/i.test(item.label));
  const candidates = explicitChapters.length > 0 ? explicitChapters : navigation;
  const index = candidates.findIndex((item) => {
    const itemHref = normalizeHref(item.href);
    return href === itemHref || href.endsWith(itemHref) || itemHref.endsWith(href);
  });

  return index >= 0 ? index + 1 : Math.max(1, location.start.index + 1);
}

function fontFaceCss(): string {
  return `
    @font-face { font-family: 'Cormorant Garamond'; src: url('${READING_FONT_ASSETS.cormorantGaramond}') format('woff2'); font-weight: 600; font-style: normal; font-display: swap; }
    @font-face { font-family: 'Lora'; src: url('${READING_FONT_ASSETS.lora}') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
    @font-face { font-family: 'Inter'; src: url('${READING_FONT_ASSETS.inter}') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
    @font-face { font-family: 'Quicksand'; src: url('${READING_FONT_ASSETS.quicksand}') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
    @font-face { font-family: 'JetBrains Mono'; src: url('${READING_FONT_ASSETS.jetbrainsMono}') format('woff2'); font-weight: 400; font-style: normal; font-display: swap; }
  `;
}

function themeCss(theme: ReadingThemePreset): string {
  const root = `html.reader-${theme.id}`;
  const bodyFont = theme.bodyFont ? `font-family: ${theme.bodyFont} !important;` : "";
  const headingFont = theme.headingFont
    ? `font-family: ${theme.headingFont} !important;`
    : "";
  const codeFont = theme.codeFont
    ? `font-family: ${theme.codeFont} !important;`
    : "";
  const texture = theme.textureUrl
    ? `background-image: url('${theme.textureUrl}'); opacity: ${theme.textureOpacity};`
    : "display: none;";
  return `${fontFaceCss()}
    ${root}, ${root} body {
      background-color: ${theme.background} !important;
      color: ${theme.foreground} !important;
      transition: background-color 400ms ease, color 400ms ease;
    }
    ${root} body {
      box-sizing: border-box !important;
      margin: 0 auto !important;
      max-width: 100% !important;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
      ${bodyFont}
    }
    ${root} body::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: 2147483646;
      pointer-events: none;
      transition: opacity 400ms ease;
    }
    ${root} body::before { ${texture} }
    ${root} p, ${root} li, ${root} blockquote {
      color: ${theme.foreground} !important;
      line-height: inherit !important;
      margin-block-end: ${theme.paragraphSpacing}em !important;
      transition: color 400ms ease;
    }
    ${root} h1, ${root} h2, ${root} h3, ${root} h4, ${root} h5, ${root} h6 {
      color: ${theme.foreground} !important;
      ${headingFont}
      transition: color 400ms ease;
    }
    ${root} code, ${root} pre, ${root} kbd, ${root} samp, ${root} table[data-technical] {
      ${codeFont}
    }
    ${root} a { color: ${theme.accent} !important; }
    ${root} img { max-width: 100% !important; object-fit: contain; }
    ${root} ::selection { background: ${theme.accent}40; }
  `;
}

function registerReadingThemes(rendition: Rendition) {
  for (const theme of READING_THEME_PRESETS) {
    rendition.themes.registerCss(`reader-${theme.id}`, themeCss(theme));
  }
}

function applyPreferences(
  rendition: Rendition,
  preferences: ReaderPreferences,
  readingTheme: ReadingThemePreset,
) {
  const font = getFontOption(preferences.font);
  const margin = getMarginPixels(preferences.margin);
  const effectiveLineHeight = readingTheme.lineHeight ?? preferences.lineHeight;

  rendition.themes.select(`reader-${readingTheme.id}`);
  rendition.themes.font(font.family);
  rendition.themes.fontSize(`${preferences.fontSize}px`);
  rendition.themes.override("line-height", `${effectiveLineHeight}`, true);
  rendition.themes.override("padding-left", `${margin}px`, true);
  rendition.themes.override("padding-right", `${margin}px`, true);
  rendition.themes.override("background-color", readingTheme.background, true);
  rendition.themes.override("color", readingTheme.foreground, true);
}

function percentageFromLocation(book: Book, location: Location): number {
  let percentage = location.start.percentage;

  if (!Number.isFinite(percentage)) {
    try {
      percentage = book.locations.percentageFromCfi(location.start.cfi);
    } catch {
      percentage = 0;
    }
  }

  return Math.min(1, Math.max(0, percentage || 0));
}

export function useEpubReader(
  readerBook: ReaderBook,
  preferences: ReaderPreferences,
  readingTheme: ReadingThemePreset,
  onRevealChrome: () => void,
  highlights: ReadingHighlight[],
  onPageChanged: (pageKey: string) => void,
  initialLocation?: string,
): EpubReaderState {
  const containerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const locationRef = useRef<string | null>(null);
  const navigationRef = useRef<NavItem[]>([]);
  const revealChromeRef = useRef(onRevealChrome);
  const onPageChangedRef = useRef(onPageChanged);
  const appliedHighlightsRef = useRef(new Map<string, { cfi: string; color: string }>());
  const [progress, setProgress] = useState(0);
  const [chapter, setChapter] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<EpubTextSelection | null>(null);
  const [navigation, setNavigation] = useState<EpubNavigationItem[]>([]);
  const [currentLocation, setCurrentLocation] = useState<string | null>(null);

  revealChromeRef.current = onRevealChrome;
  onPageChangedRef.current = onPageChanged;

  useEffect(() => {
    const rendition = renditionRef.current;
    if (rendition) applyPreferences(rendition, preferences, readingTheme);
  }, [preferences, readingTheme]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition || !isReady) return;

    const nextIds = new Set(highlights.map((highlight) => String(highlight.id)));
    for (const [id, applied] of appliedHighlightsRef.current) {
      if (!nextIds.has(id)) {
        rendition.annotations.remove(applied.cfi, "highlight");
        appliedHighlightsRef.current.delete(id);
      }
    }

    for (const highlight of highlights) {
      const id = String(highlight.id);
      const applied = appliedHighlightsRef.current.get(id);
      if (applied?.cfi === highlight.location && applied.color === highlight.color) continue;
      if (applied) rendition.annotations.remove(applied.cfi, "highlight");
      rendition.annotations.highlight(
        highlight.location,
        { highlightId: id },
        undefined,
        "reader-epub-highlight",
        {
          fill: highlight.color,
          "fill-opacity": "0.35",
          "mix-blend-mode": "multiply",
        },
      );
      appliedHighlightsRef.current.set(id, { cfi: highlight.location, color: highlight.color });
    }
  }, [highlights, isReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let active = true;
    setIsReady(false);
    setError(null);
    setSelection(null);
    appliedHighlightsRef.current.clear();
    container.replaceChildren();

    const book = ePub(readerBook.sourceUrl);
    const rendition = book.renderTo(container, {
      width: "100%",
      height: "100%",
      manager: preferences.flow === "scrolled" ? "continuous" : "default",
      flow: preferences.flow === "scrolled" ? "scrolled-doc" : "paginated",
      spread: "none",
      allowScriptedContent: false,
    });

    bookRef.current = book;
    renditionRef.current = rendition;
    registerReadingThemes(rendition);
    applyPreferences(rendition, preferences, readingTheme);

    const handleRelocated = (location: Location) => {
      if (!active) return;

      const nextProgress = percentageFromLocation(book, location);
      locationRef.current = location.start.cfi;
      setCurrentLocation(location.start.cfi);
      setProgress(nextProgress);
      setChapter(chapterNumberForLocation(location, navigationRef.current));
      onPageChangedRef.current(`${location.start.index}:${location.start.displayed?.page ?? location.start.cfi}`);
      saveReadingProgress(readerBook, {
        location: location.start.cfi,
        percentage: nextProgress,
      });
    };

    const handleSelected = (cfiRange: string, contents: Contents) => {
      if (!active) return;
      const nativeSelection = contents.window.getSelection();
      if (!nativeSelection || nativeSelection.rangeCount === 0 || nativeSelection.isCollapsed) return;
      const range = nativeSelection.getRangeAt(0);
      const rangeRects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
      const rect = rangeRects[0] ?? range.getBoundingClientRect();
      const frame = contents.window.frameElement as HTMLElement | null;
      const frameRect = frame?.getBoundingClientRect();
      const offsetLeft = frameRect?.left ?? 0;
      const offsetTop = frameRect?.top ?? 0;
      const localCenter = rect.left + rect.width / 2;
      const visibleCenter = frameRect && frameRect.width > 0 && (localCenter < 0 || localCenter > frameRect.width)
        ? ((localCenter % frameRect.width) + frameRect.width) % frameRect.width
        : localCenter;
      const text = nativeSelection.toString().replace(/\s+/g, " ").trim();
      if (!text) return;

      setSelection({
        cfiRange,
        text,
        // Em layout paginado, epub.js posiciona o Range na coluna completa.
        // O módulo traz essa coordenada de volta para a coluna visível do iframe.
        anchorX: offsetLeft + visibleCenter,
        top: offsetTop + rect.top,
        bottom: offsetTop + rect.bottom,
      });
    };

    const handleContentPointer = (event: MouseEvent | TouchEvent) => {
      const touchY = "changedTouches" in event ? event.changedTouches[0]?.clientY : undefined;
      const clientY = touchY ?? ("clientY" in event ? event.clientY : Number.POSITIVE_INFINITY);

      if (clientY <= 88) revealChromeRef.current();
    };

    const handleContentMouseMove = (event: MouseEvent) => {
      if (event.clientY <= 88) revealChromeRef.current();
    };

    rendition.on("relocated", handleRelocated);
    rendition.on("selected", handleSelected);
    rendition.on("mousemove", handleContentMouseMove);
    rendition.on("click", handleContentPointer);
    rendition.on("touchend", handleContentPointer);

    const initialize = async () => {
      try {
        await book.ready;
        const navigation = await book.loaded.navigation;
        navigationRef.current = flattenNavigation(navigation.toc);
        setNavigation(
          navigationRef.current.map((item) => ({ label: item.label.trim(), href: item.href })),
        );

        await book.locations.generate(1200);
        const saved = await loadReadingProgress(readerBook);
        const target = initialLocation ?? locationRef.current ?? saved?.location;

        if (!active) return;
        if (saved && !locationRef.current) setProgress(saved.percentage);

        await rendition.display(target);
        if (active) setIsReady(true);
      } catch (reason) {
        if (!active) return;
        console.error("Falha ao abrir o EPUB:", reason);
        setError("Não foi possível abrir este EPUB.");
      }
    };

    void initialize();

    return () => {
      active = false;
      rendition.off("relocated", handleRelocated);
      rendition.off("selected", handleSelected);
      rendition.off("mousemove", handleContentMouseMove);
      rendition.off("click", handleContentPointer);
      rendition.off("touchend", handleContentPointer);
      rendition.destroy();
      book.destroy();

      if (renditionRef.current === rendition) renditionRef.current = null;
      if (bookRef.current === book) bookRef.current = null;
    };
    // Recriar a rendition é necessário ao alternar entre manager paginado e contínuo.
  }, [initialLocation, preferences.flow, readerBook]);

  const next = useCallback(async () => {
    await renditionRef.current?.next();
  }, []);

  const previous = useCallback(async () => {
    await renditionRef.current?.prev();
  }, []);

  const dismissSelection = useCallback(() => {
    setSelection(null);
    const rendition = renditionRef.current;
    if (!rendition) return;
    const contents = rendition.getContents() as unknown as Contents[];
    for (const content of contents) content.window.getSelection()?.removeAllRanges();
  }, []);

  const displayLocation = useCallback(async (location: string) => {
    await renditionRef.current?.display(location);
  }, []);

  const search = useCallback(async (query: string): Promise<EpubSearchResult[]> => {
    const book = bookRef.current;
    const normalizedQuery = query.trim();
    if (!book || normalizedQuery.length < 2) return [];

    const sections: Array<ReturnType<Book["spine"]["get"]>> = [];
    book.spine.each((section: ReturnType<Book["spine"]["get"]>) => sections.push(section));
    const results: EpubSearchResult[] = [];

    for (const section of sections) {
      if (results.length >= 30) break;
      try {
        await section.load(book.load.bind(book));
        const matches = section.find(normalizedQuery) as unknown as EpubSearchResult[];
        results.push(...matches.slice(0, 30 - results.length));
      } finally {
        section.unload();
      }
    }

    return results;
  }, []);

  return {
    containerRef,
    progress,
    chapter,
    isReady,
    error,
    next,
    previous,
    selection,
    navigation,
    currentLocation,
    dismissSelection,
    displayLocation,
    search,
  };
}
