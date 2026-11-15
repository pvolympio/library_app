import { useTheme } from "@/hooks/useTheme";

interface SilentModeButtonProps {
  showLabel?: boolean;
}

export function SilentModeButton({ showLabel = false }: SilentModeButtonProps) {
  const { isMuted, toggleMuted } = useTheme();
  const actionLabel = isMuted ? "Ativar sons ambientes" : "Ativar modo silencioso";

  return (
    <button
      type="button"
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-theme-text/20 bg-theme-surface px-2.5 font-theme-body text-sm font-semibold text-theme-text hover:border-theme-text/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-text"
      onClick={toggleMuted}
      aria-label={actionLabel}
      aria-pressed={isMuted}
      title={actionLabel}
    >
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M11 5 6.8 8.4H3.5v7.2h3.3L11 19V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        {isMuted ? (
          <path d="m16 9 5 6m0-6-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        ) : (
          <path d="M15 8.2a5.2 5.2 0 0 1 0 7.6M18 5.5a9 9 0 0 1 0 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
      {showLabel && <span>{isMuted ? "Modo silencioso" : "Sons ativos · 20%"}</span>}
    </button>
  );
}
