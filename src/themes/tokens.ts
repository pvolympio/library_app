/**
 * Design tokens do app.
 *
 * Cada "biblioteca" (Alice, Harry Potter, Percy Jackson, ...) é representada
 * por um objeto `LibraryTheme`. O ThemeProvider injeta esses valores como
 * CSS custom properties no elemento raiz, e o Tailwind referencia essas
 * variáveis (ver tailwind.config.js -> theme.extend.colors.theme).
 */

export interface LibraryThemeColors {
  /** Cor de fundo geral do app */
  background: string;
  /** Cor de superfícies (cards, painéis, modais) */
  surface: string;
  /** Cor primária (destaques principais, botões) */
  primary: string;
  /** Cor de acento (detalhes, hover, badges) */
  accent: string;
  /** Cor de texto padrão sobre o background/surface */
  text: string;
  /** Secondary text color validated against background and surface. */
  textSecondary: string;
}

export interface LibraryThemeFonts {
  /** Fonte usada em títulos/headings */
  heading: string;
  /** Fonte usada no corpo de texto */
  body: string;
}

export interface LibraryThemeTextures {
  /** Imagem/SVG de fundo principal (ex: papel de parede da estante) */
  background?: string;
  /** Textura sutil sobreposta (ex: papel, tecido, pergaminho) */
  overlay?: string;
}

export interface LibraryThemeSounds {
  /** Som ambiente tocado em loop baixo (opcional) */
  ambient?: string;
  /** Som de "virar página" ou similar (opcional) */
  pageTurn?: string;
}

export interface LibraryTheme {
  /** Identificador único do tema (usado no localStorage e no seletor) */
  id: string;
  /** Nome de exibição do tema */
  name: string;
  colors: LibraryThemeColors;
  fonts: LibraryThemeFonts;
  textures: LibraryThemeTextures;
  /** Sons são opcionais: nem todo tema precisa ter áudio ambiente */
  sounds?: LibraryThemeSounds;
}

/**
 * Mapeia um LibraryTheme para o conjunto de CSS custom properties
 * que serão escritas no elemento raiz pelo ThemeProvider.
 */
export function themeToCssVars(theme: LibraryTheme): Record<string, string> {
  return {
    "--theme-color-background": theme.colors.background,
    "--theme-color-surface": theme.colors.surface,
    "--theme-color-primary": theme.colors.primary,
    "--theme-color-accent": theme.colors.accent,
    "--theme-color-text": theme.colors.text,
    "--theme-color-text-secondary": theme.colors.textSecondary,

    "--theme-font-heading": theme.fonts.heading,
    "--theme-font-body": theme.fonts.body,

    "--theme-texture-background": theme.textures.background
      ? `url(${theme.textures.background})`
      : "none",
    "--theme-texture-overlay": theme.textures.overlay
      ? `url(${theme.textures.overlay})`
      : "none",
  };
}

export const THEME_STORAGE_KEY = "library-app:active-theme";
export const SILENT_MODE_STORAGE_KEY = "library-app:silent-mode";
