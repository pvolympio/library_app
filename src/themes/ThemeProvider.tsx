import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  SILENT_MODE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  themeToCssVars,
  type LibraryTheme,
} from "./tokens";
import { defaultTheme, getThemeById, themes } from "./index";

interface ThemeContextValue {
  /** Tema atualmente ativo */
  theme: LibraryTheme;
  /** Lista de todos os temas disponíveis (para popular seletores) */
  availableThemes: LibraryTheme[];
  /** Troca o tema ativo por id e persiste no localStorage */
  setThemeById: (id: string) => void;
  /** Modo silencioso global; começa ativo para nunca reproduzir áudio sem ação. */
  isMuted: boolean;
  toggleMuted: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

function loadInitialTheme(): LibraryTheme {
  if (typeof window === "undefined") return defaultTheme;

  try {
    const storedId = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (storedId) {
      const found = getThemeById(storedId);
      if (found) return found;
    }
  } catch {
    // localStorage indisponível (ex: modo privado) — ignora e usa o default
  }

  return defaultTheme;
}

function loadInitialSilentMode(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const value = window.localStorage.getItem(SILENT_MODE_STORAGE_KEY);
    return value == null ? true : value !== "false";
  } catch {
    return true;
  }
}

/**
 * Injeta o LibraryTheme ativo como CSS custom properties no elemento raiz
 * (:root), permitindo que o Tailwind as referencie (ver tailwind.config.js).
 */
function applyThemeToDocument(theme: LibraryTheme) {
  const root = document.documentElement;
  const vars = themeToCssVars(theme);

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  // Facilita seletores CSS/debug: <html data-theme="alice">
  root.setAttribute("data-theme", theme.id);
  root.style.colorScheme = theme.id === "harry-potter" ? "dark" : "light";
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute("content", theme.colors.background);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<LibraryTheme>(() => loadInitialTheme());
  const [isMuted, setIsMuted] = useState(loadInitialSilentMode);
  const [crossfade, setCrossfade] = useState<{ key: number; color: string } | null>(null);
  const themeRef = useRef(theme);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    themeRef.current = theme;
    applyThemeToDocument(theme);
  }, [theme]);

  const setThemeById = useCallback((id: string) => {
    const next = getThemeById(id);
    if (!next) {
      console.warn(`[ThemeProvider] Tema desconhecido: "${id}"`);
      return;
    }

    if (themeRef.current.id === next.id) return;
    if (!reduceMotion) {
      setCrossfade({ key: Date.now(), color: themeRef.current.colors.background });
    }
    themeRef.current = next;
    setTheme(next);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // Ignora falhas de persistência (ex: storage cheio/bloqueado)
    }
  }, [reduceMotion]);

  const toggleMuted = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SILENT_MODE_STORAGE_KEY, String(next));
      } catch {
        // O controle continua funcional mesmo sem persistência.
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const ambientSource = theme.sounds?.ambient;
    if (isMuted || !ambientSource) return;

    const audio = new Audio(ambientSource);
    audio.loop = true;
    audio.volume = 0.2;
    void audio.play().catch(() => {
      // Navegadores podem exigir uma interação adicional antes de tocar áudio.
    });
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [isMuted, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, availableThemes: themes, setThemeById, isMuted, toggleMuted }),
    [theme, setThemeById, isMuted, toggleMuted],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {crossfade && (
        <motion.div
          key={crossfade.key}
          className="library-theme-crossfade"
          style={{ backgroundColor: crossfade.color }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          onAnimationComplete={() => setCrossfade(null)}
          aria-hidden="true"
        />
      )}
    </ThemeContext.Provider>
  );
}
