import type { LibraryTheme } from "./tokens";

/**
 * Tema "Mary".
 * Paleta vibrante inspirada em gatos:
 * #5CACC4 (azul turquesa), #8CD19D (menta), #CEE879 (lima),
 * #FCB653 (laranja dourado) e #FF5254 (coral vibrante).
 */
export const maryTheme: LibraryTheme = {
  id: "mary",
  name: "Mary",
  colors: {
    background: "#F2FAF8",
    surface: "#FFFFFF",
    primary: "#2B8CA8",
    accent: "#FF5254",
    text: "#1A2B32",
    textSecondary: "#3E5660",
  },
  fonts: {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  textures: {},
};
