import type { LibraryTheme } from "./tokens";

/**
 * Tema "Percy Jackson".
 * Paleta inspirada em mar Egeu, mármore clássico e bronze celestial.
 * Cores com proporção de contraste aprimorada para leitura prolongada.
 */
export const percyJacksonTheme: LibraryTheme = {
  id: "percy-jackson",
  name: "Percy Jackson",
  colors: {
    background: "#EDF5F8",
    surface: "#FFFFFF",
    primary: "#144D6B",
    accent: "#B8860B",
    text: "#122026",
    textSecondary: "#425661",
  },
  fonts: {
    heading: "'Cormorant Garamond', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  textures: {},
};
