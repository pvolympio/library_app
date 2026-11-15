import { useContext } from "react";
import { ThemeContext } from "@/themes/ThemeProvider";

/**
 * Hook para consumir o tema ativo e a função de troca de tema.
 * Deve ser usado dentro de um <ThemeProvider>.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de um <ThemeProvider>");
  }

  return ctx;
}
