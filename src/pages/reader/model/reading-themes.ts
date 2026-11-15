export type ReadingPresetId =
  | "fantasy"
  | "science-fiction"
  | "horror"
  | "romance"
  | "nonfiction"
  | "children";

export interface ReadingThemeSettings {
  automaticByGenre: boolean;
  manualPresetId: ReadingPresetId;
}

export interface ReadingThemePreset {
  id: ReadingPresetId;
  label: string;
  shortLabel: string;
  background: string;
  foreground: string;
  accent: string;
  secondaryAccent?: string;
  headingFont?: string;
  bodyFont?: string;
  codeFont?: string;
  lineHeight?: number;
  paragraphSpacing: number;
  uiRadius: number;
  textureUrl?: string;
  textureOpacity: number;
  vignette?: string;
}

const parchmentTextureUrl = new URL("../ui/parchment-texture.svg", import.meta.url).href;

export const READING_THEME_PRESETS: ReadingThemePreset[] = [
  {
    id: "fantasy",
    label: "Fantasia",
    shortLabel: "Fantasia",
    background: "#F5EBDD",
    foreground: "#3B2F1E",
    accent: "#8B6914",
    headingFont: "'Cormorant Garamond', Georgia, serif",
    paragraphSpacing: 1,
    uiRadius: 8,
    textureUrl: parchmentTextureUrl,
    textureOpacity: 0.08,
  },
  {
    id: "science-fiction",
    label: "Ficção científica",
    shortLabel: "Sci-fi",
    background: "#0F1620",
    foreground: "#D8E4F0",
    accent: "#3FA9F5",
    codeFont: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace",
    paragraphSpacing: 1,
    uiRadius: 4,
    textureOpacity: 0,
  },
  {
    id: "horror",
    label: "Terror / suspense",
    shortLabel: "Terror",
    background: "#141414",
    foreground: "#C9C9C9",
    accent: "#C9C9C9",
    paragraphSpacing: 1,
    uiRadius: 8,
    textureOpacity: 0,
    vignette: "radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, 0.4) 100%)",
  },
  {
    id: "romance",
    label: "Romance",
    shortLabel: "Romance",
    background: "#FDF3F0",
    foreground: "#4A2C2A",
    accent: "#C97064",
    headingFont: "Lora, Georgia, serif",
    paragraphSpacing: 1.3,
    uiRadius: 8,
    textureOpacity: 0,
  },
  {
    id: "nonfiction",
    label: "Não-ficção / técnico",
    shortLabel: "Técnico",
    background: "#FFFFFF",
    foreground: "#1A1A1A",
    accent: "#1A1A1A",
    bodyFont: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    lineHeight: 1.7,
    paragraphSpacing: 1,
    uiRadius: 8,
    textureOpacity: 0,
  },
  {
    id: "children",
    label: "Infantil",
    shortLabel: "Infantil",
    background: "#FFF9E6",
    foreground: "#2D2D2D",
    accent: "#FF6B6B",
    secondaryAccent: "#4ECDC4",
    headingFont: "Quicksand, 'Arial Rounded MT Bold', sans-serif",
    bodyFont: "Quicksand, 'Arial Rounded MT Bold', sans-serif",
    paragraphSpacing: 1,
    uiRadius: 16,
    textureOpacity: 0,
  },
];

export const DEFAULT_READING_THEME_SETTINGS: ReadingThemeSettings = {
  automaticByGenre: true,
  manualPresetId: "fantasy",
};

export function getReadingPreset(id: ReadingPresetId): ReadingThemePreset {
  return READING_THEME_PRESETS.find((preset) => preset.id === id) ?? READING_THEME_PRESETS[0];
}

export function presetIdForGenre(genre: string): ReadingPresetId {
  const normalized = genre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (/ficcao cientifica|science fiction|sci-fi|cyberpunk/.test(normalized)) {
    return "science-fiction";
  }
  if (/terror|horror|suspense|thriller|misterio/.test(normalized)) return "horror";
  if (/romance|romantico|romantica/.test(normalized)) return "romance";
  if (/nao-ficcao|nao ficcao|tecnico|tecnica|biografia|historia|ensaio/.test(normalized)) {
    return "nonfiction";
  }
  if (/infantil|crianca|juvenil|children|kids/.test(normalized)) return "children";
  return "fantasy";
}

export function resolveReadingPreset(
  genre: string,
  settings: ReadingThemeSettings,
): ReadingThemePreset {
  return getReadingPreset(
    settings.automaticByGenre ? presetIdForGenre(genre) : settings.manualPresetId,
  );
}
