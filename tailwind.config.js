/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Essas cores/fontes leem as CSS custom properties injetadas
      // pelo ThemeProvider (ver src/themes/ThemeProvider.tsx).
      // Uso: bg-theme-background, text-theme-primary, font-theme-heading...
      colors: {
        theme: {
          background: "var(--theme-color-background)",
          surface: "var(--theme-color-surface)",
          primary: "var(--theme-color-primary)",
          accent: "var(--theme-color-accent)",
          text: "var(--theme-color-text)",
          muted: "var(--theme-color-text-secondary)",
        },
      },
      fontFamily: {
        "theme-heading": "var(--theme-font-heading)",
        "theme-body": "var(--theme-font-body)",
      },
      backgroundImage: {
        "theme-texture": "var(--theme-texture-background)",
      },
      transitionProperty: {
        theme: "background-color, color, border-color, opacity, background-image",
      },
    },
  },
  plugins: [],
};
