import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ThemeSelector } from "@/components/ThemeSelector";
import { SilentModeButton } from "@/features/ambient-sound";
import { useLibrary } from "@/entities/library";
import "./app-shell.css";

function BrandMark() {
  return (
    <span className="app-brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function Icon({
  name,
}: {
  name: "discover" | "library" | "notes" | "stats" | "search" | "settings" | "palette" | "close";
}) {
  const paths = {
    discover: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
      </>
    ),
    library: (
      <>
        <path d="M4 5.5h5v14H4zM10.5 3.5h5v16h-5zM17 7h3v12.5h-3z" />
      </>
    ),
    notes: (
      <>
        <path d="M6 3.8h9.8L19 7v13.2H6V3.8Z" />
        <path d="M15.5 4v3.4H19M9 11h7M9 14.5h7" />
      </>
    ),
    stats: <path d="M5 19V9m5 10V5m5 14v-7m5 7V3" />,
    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 4.2 4.2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 13.3c.1-.4.1-.9.1-1.3s0-.9-.1-1.3l2-1.5-2-3.4-2.5 1a9 9 0 0 0-2.2-1.3L14.4 3h-4.8l-.4 2.5A9 9 0 0 0 7 6.8l-2.4-1-2 3.4 2 1.5c-.1.4-.1.9-.1 1.3s0 .9.1 1.3l-2 1.5 2 3.4 2.4-1a9 9 0 0 0 2.2 1.3l.4 2.5h4.8l.3-2.5a9 9 0 0 0 2.2-1.3l2.5 1 2-3.4-2-1.5Z" />
      </>
    ),
    palette: (
      <>
        <path d="M12 3a9 9 0 0 0 0 18h1.4a2.1 2.1 0 0 0 1.3-3.7 1.9 1.9 0 0 1 1.2-3.4H18A3 3 0 0 0 21 11c0-4.4-4-8-9-8Z" />
        <circle cx="7.5" cy="10" r=".8" />
        <circle cx="10" cy="6.8" r=".8" />
        <circle cx="15" cy="7.5" r=".8" />
      </>
    ),
    close: <path d="m6 6 12 12M6 18 18 6" strokeLinecap="round" strokeLinejoin="round" />,
  }[name];
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {paths}
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/", label: "Descobrir", icon: "discover" as const, end: true },
  { to: "/biblioteca", label: "Minha Biblioteca", icon: "library" as const },
  { to: "/anotacoes", label: "Anotações", icon: "notes" as const },
  { to: "/estatisticas", label: "Estatísticas", icon: "stats" as const },
];

const MOBILE_NAV_ITEMS = [
  { to: "/", label: "Descobrir", icon: "discover" as const, end: true },
  { to: "/biblioteca", label: "Biblioteca", icon: "library" as const },
  { to: "/anotacoes", label: "Anotações", icon: "notes" as const },
  { to: "/estatisticas", label: "Estatísticas", icon: "stats" as const },
  { to: "/configuracoes", label: "Ajustes", icon: "settings" as const },
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { entries } = useLibrary();
  const [themeOpen, setThemeOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setThemeOpen(false);
    setMobileSearchOpen(false);
    document.getElementById("app-main-content")?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    if (!themeOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setThemeOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [themeOpen]);

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchRef.current?.focus();
    }
  }, [mobileSearchOpen]);

  const submitSearch = (query: string) => {
    const trimmed = query.trim();
    if (trimmed) {
      setMobileSearchOpen(false);
      navigate(`/catalogo?q=${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-main-content">
        Pular para o conteúdo
      </a>
      <header className="app-header">
        <NavLink className="app-brand" to="/" aria-label="Entrelinhas — início">
          <BrandMark />
          <span>
            <strong>Entrelinhas</strong>
            <small>Biblioteca viva</small>
          </span>
        </NavLink>

        <form
          className="app-global-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch(searchRef.current?.value ?? "");
          }}
        >
          <Icon name="search" />
          <label className="sr-only" htmlFor="global-search">
            Buscar no catálogo
          </label>
          <input
            ref={searchRef}
            id="global-search"
            name="q"
            autoComplete="off"
            placeholder="Buscar título, autor ou ISBN…"
          />
          <kbd aria-hidden="true">Enter</kbd>
        </form>

        <nav className="app-primary-nav" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "is-active" : "")}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.to === "/biblioteca" && entries.length > 0 ? (
                <em>{entries.length}</em>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="app-utilities">
          <button
            type="button"
            className="app-icon-button app-mobile-search-toggle"
            aria-label={mobileSearchOpen ? "Fechar busca" : "Abrir busca"}
            aria-expanded={mobileSearchOpen}
            onClick={() => setMobileSearchOpen((open) => !open)}
          >
            <Icon name={mobileSearchOpen ? "close" : "search"} />
          </button>

          <button
            type="button"
            className="app-icon-button"
            aria-label="Mudar atmosfera da biblioteca"
            aria-expanded={themeOpen}
            onClick={() => setThemeOpen((open) => !open)}
          >
            <Icon name="palette" />
          </button>

          <SilentModeButton />

          <NavLink
            className="app-icon-button app-settings-desktop-btn"
            to="/configuracoes"
            aria-label="Configurações"
          >
            <Icon name="settings" />
          </NavLink>

          {themeOpen ? (
            <div className="app-theme-popover" role="dialog" aria-label="Atmosfera da biblioteca">
              <p>Atmosfera da biblioteca</p>
              <ThemeSelector onSelect={() => setThemeOpen(false)} />
            </div>
          ) : null}
        </div>
      </header>

      {mobileSearchOpen && (
        <div className="app-mobile-search-overlay" role="search">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(mobileSearchRef.current?.value ?? "");
            }}
          >
            <Icon name="search" />
            <input
              ref={mobileSearchRef}
              name="mobile-q"
              placeholder="Buscar título, autor ou ISBN…"
              autoComplete="off"
            />
            <button type="submit">Buscar</button>
          </form>
        </div>
      )}

      <div id="app-main-content" className="app-route-stage" tabIndex={-1}>
        <Outlet />
      </div>

      <nav className="app-mobile-nav" aria-label="Navegação principal móvel">
        {MOBILE_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? "is-active" : "")}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
            {item.to === "/biblioteca" && entries.length > 0 ? (
              <em className="app-mobile-badge">{entries.length}</em>
            ) : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
