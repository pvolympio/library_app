export const HIGHLIGHT_COLORS = [
  { id: "yellow", label: "Amarelo", value: "#FFE066" },
  { id: "green", label: "Verde", value: "#95D5B2" },
  { id: "blue", label: "Azul", value: "#A8DADC" },
  { id: "pink", label: "Rosa", value: "#F4A6C6" },
] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number]["value"];

export interface ReadingBookReference {
  storageKey: string;
  title: string;
  author: string;
}

export interface ReadingHighlight {
  id: number | string;
  bookId: number | null;
  bookStorageKey: string;
  bookTitle: string;
  location: string;
  excerpt: string;
  color: HighlightColor;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingHighlightDraft {
  location: string;
  excerpt: string;
  color: HighlightColor;
  note?: string;
}

export interface DailyReadingStat {
  date: string;
  label: string;
  minutes: number;
}

export interface ReadingStatistics {
  totalSeconds: number;
  pagesToday: number;
  currentStreak: number;
  booksCompletedThisYear: number;
  annualGoal: number;
  daily: DailyReadingStat[];
}

export interface ReadingSessionHandle {
  id: number | string;
  bookStorageKey: string;
  startedAt: string;
}

export const DEFAULT_ANNUAL_GOAL = 12;

export function isHighlightColor(value: string): value is HighlightColor {
  return HIGHLIGHT_COLORS.some((color) => color.value === value);
}
