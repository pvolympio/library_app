import type { LibraryTheme } from "./tokens";

/**
 * Tema "Alice no País das Maravilhas".
 * Paleta refinada inspirada em chá vitoriano, cartas e veludo.
 * Cores ajustadas para garantir conformidade de contraste WCAG AA.
 */
export const aliceTheme: LibraryTheme = {
  id: "alice",
  name: "Alice no País das Maravilhas",
  colors: {
    background: "#FDF2F4",
    surface: "#FFFFFF",
    primary: "#BC3F7C",
    accent: "#B8860B",
    text: "#2A1828",
    textSecondary: "#5C435C",
  },
  fonts: {
    heading: "'Playfair Display', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  textures: {},
};
