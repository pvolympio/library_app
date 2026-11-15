export type ReaderFont = "serif" | "sans" | "dyslexic";
export type ReaderLineHeight = 1.4 | 1.6 | 1.9;
export type ReaderMargin = "narrow" | "normal" | "wide";
export type ReaderFlow = "paginated" | "scrolled";

export interface ReaderPreferences {
  fontSize: number;
  font: ReaderFont;
  lineHeight: ReaderLineHeight;
  margin: ReaderMargin;
  flow: ReaderFlow;
  brightness: number;
}

export interface ReaderBook {
  storageKey: string;
  title: string;
  author: string;
  genre: string;
  sourceUrl: string | ArrayBuffer;
}

export interface FontOption {
  id: ReaderFont;
  label: string;
  family: string;
}

export const FONT_SIZES = [14, 16, 18, 20, 22] as const;

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "serif",
    label: "Serifada",
    family: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "sans",
    label: "Sem serifa",
    family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    id: "dyslexic",
    label: "Disléxica",
    family: "OpenDyslexic, 'Atkinson Hyperlegible', Verdana, sans-serif",
  },
];

export const LINE_HEIGHT_OPTIONS: Array<{
  value: ReaderLineHeight;
  label: string;
}> = [
  { value: 1.4, label: "Compacto" },
  { value: 1.6, label: "Normal" },
  { value: 1.9, label: "Amplo" },
];

export const MARGIN_OPTIONS: Array<{
  value: ReaderMargin;
  label: string;
  pixels: number;
}> = [
  { value: "narrow", label: "Estreita", pixels: 24 },
  { value: "normal", label: "Normal", pixels: 44 },
  { value: "wide", label: "Larga", pixels: 68 },
];

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  fontSize: 18,
  font: "serif",
  lineHeight: 1.6,
  margin: "normal",
  flow: "paginated",
  brightness: 1,
};

export const READER_PREFERENCES_STORAGE_KEY = "library-app:reader-preferences";

export function getFontOption(font: ReaderFont): FontOption {
  return FONT_OPTIONS.find((option) => option.id === font) ?? FONT_OPTIONS[0];
}

export function getMarginPixels(margin: ReaderMargin): number {
  return MARGIN_OPTIONS.find((option) => option.value === margin)?.pixels ?? 44;
}

export const ALICE_DEMO_BOOK: ReaderBook = {
  storageKey: "project-gutenberg:11",
  title: "Alice no País das Maravilhas",
  author: "Lewis Carroll",
  genre: "Fantasia",
  sourceUrl: new URL("./alice-in-wonderland.epub", import.meta.url).href,
};
