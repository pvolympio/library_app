import type { LibraryTheme } from "./tokens";
import { aliceTheme } from "./alice";
import { harryPotterTheme } from "./harry-potter";
import { maryTheme } from "./mary";

export * from "./tokens";
export { ThemeProvider } from "./ThemeProvider";

/** Lista de todos os temas ("bibliotecas") disponíveis no app. */
export const themes: LibraryTheme[] = [
  aliceTheme,
  harryPotterTheme,
  maryTheme,
];

export const defaultTheme: LibraryTheme = aliceTheme;

export function getThemeById(id: string): LibraryTheme | undefined {
  if (id === "percy-jackson") return maryTheme;
  return themes.find((t) => t.id === id);
}
