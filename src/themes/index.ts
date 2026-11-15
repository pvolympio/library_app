import type { LibraryTheme } from "./tokens";
import { aliceTheme } from "./alice";
import { harryPotterTheme } from "./harry-potter";
import { percyJacksonTheme } from "./percy-jackson";

export * from "./tokens";
export { ThemeProvider } from "./ThemeProvider";

/** Lista de todos os temas ("bibliotecas") disponíveis no app. */
export const themes: LibraryTheme[] = [
  aliceTheme,
  harryPotterTheme,
  percyJacksonTheme,
];

export const defaultTheme: LibraryTheme = aliceTheme;

export function getThemeById(id: string): LibraryTheme | undefined {
  return themes.find((t) => t.id === id);
}
