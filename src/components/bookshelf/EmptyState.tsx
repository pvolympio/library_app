interface EmptyStateProps {
  groupByLabel: string;
}

export function EmptyState({ groupByLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-theme-primary/25 bg-theme-surface/40 px-8 py-16 text-center">
      <svg
        width="96"
        height="96"
        viewBox="0 0 96 96"
        fill="none"
        aria-hidden="true"
        className="opacity-80"
      >
        <rect x="10" y="70" width="76" height="6" rx="2" fill="var(--theme-color-primary)" />
        <rect x="16" y="26" width="12" height="44" rx="1.5" fill="var(--theme-color-accent)" opacity="0.9" />
        <rect x="30" y="20" width="12" height="50" rx="1.5" fill="var(--theme-color-primary)" opacity="0.75" />
        <rect x="44" y="30" width="12" height="40" rx="1.5" fill="var(--theme-color-accent)" opacity="0.6" />
        <g transform="translate(58 24)">
          <path
            d="M0 4C0 1.8 1.8 0 4 0h9v46H4c-2.2 0-4-1.8-4-4V4Z"
            fill="var(--theme-color-primary)"
            opacity="0.9"
          />
          <path
            d="M26 4C26 1.8 24.2 0 22 0h-9v46h9c2.2 0 4-1.8 4-4V4Z"
            fill="var(--theme-color-primary)"
            opacity="0.9"
          />
        </g>
      </svg>

      <div className="space-y-1">
        <h3 className="font-theme-heading text-lg font-semibold text-theme-text">
          Sua estante está vazia
        </h3>
        <p className="max-w-xs font-theme-body text-sm text-theme-muted">
          Os livros que você adicionar vão aparecer aqui, organizados por{" "}
          {groupByLabel}.
        </p>
      </div>
    </div>
  );
}
