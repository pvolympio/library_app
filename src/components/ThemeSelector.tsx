import { useTheme } from "@/hooks/useTheme";

/**
 * Seletor de tema: um botão por "biblioteca" disponível.
 * Troca o tema ativo via ThemeProvider (que já persiste no localStorage).
 */
export function ThemeSelector({ onSelect }: { onSelect?: () => void }) {
  const { theme, availableThemes, setThemeById } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Selecionar biblioteca/tema"
      className="flex flex-wrap items-center gap-3"
    >
      {availableThemes.map((t) => {
        const isActive = t.id === theme.id;

        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => {
              setThemeById(t.id);
              onSelect?.();
            }}
            className={[
              "min-h-10 rounded-lg px-4 py-2 text-sm font-semibold font-theme-body transition-theme",
              "border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme-text focus-visible:ring-offset-2 focus-visible:ring-offset-theme-surface",
              isActive
                ? "border-theme-text bg-theme-text text-theme-surface"
                : "border-theme-text/25 bg-theme-surface text-theme-text hover:border-theme-text/60",
            ].join(" ")}
          >
            {t.name}
          </button>
        );
      })}
    </div>
  );
}
