import type { LibraryTheme } from "./tokens";

/**
 * Tema "Harry Potter".
 * Paleta inspirada em Hogwarts: carvalho antigo, bordô e ouro encantado.
 * Cores ajustadas para contraste WCAG AA em fundos escuros.
 */
export const harryPotterTheme: LibraryTheme = {
  id: "harry-potter",
  name: "Harry Potter",
  colors: {
    background: "#18120E",
    surface: "#261C14",
    primary: "#A32424",
    accent: "#E2B646",
    text: "#F5ECD8",
    textSecondary: "#CCBE9E",
  },
  fonts: {
    heading: "'Cinzel', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  textures: {},
};
