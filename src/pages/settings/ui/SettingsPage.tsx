import { useEffect, useState } from "react";
import { DEFAULT_ANNUAL_GOAL, loadReadingStatistics, setAnnualReadingGoal } from "@/entities/reading-activity";
import { SilentModeButton } from "@/features/ambient-sound";
import { useTheme } from "@/hooks/useTheme";
import { useToast } from "@/shared/ui";
import "./settings.css";

interface SettingsPageProps { onBack: () => void; onOpenReader: () => void }

export function SettingsPage({ onBack, onOpenReader }: SettingsPageProps) {
  const { theme, availableThemes, setThemeById } = useTheme();
  const { notify } = useToast();
  const [annualGoal, setAnnualGoal] = useState(DEFAULT_ANNUAL_GOAL);
  const [isSaving, setIsSaving] = useState(false);
  const [goalLoaded, setGoalLoaded] = useState(false);

  useEffect(() => { let active = true; void loadReadingStatistics().then((statistics) => { if (active) { setAnnualGoal(statistics.annualGoal); setGoalLoaded(true); } }); return () => { active = false; }; }, []);
  useEffect(() => { if (!goalLoaded) return; setIsSaving(true); const timer = window.setTimeout(() => void setAnnualReadingGoal(annualGoal).then(() => notify("Meta anual salva")).finally(() => setIsSaving(false)), 550); return () => window.clearTimeout(timer); }, [annualGoal, goalLoaded, notify]);
  const changeGoal = (nextGoal: number) => setAnnualGoal(Math.max(1, Math.round(nextGoal)));

  return <main className="settings-page">
    <header className="settings-header"><button type="button" className="settings-back" onClick={onBack} aria-label="Voltar à biblioteca"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button><div><p>Preferências</p><h1>Configurações</h1></div></header>
    <div className="settings-sections">
      <section className="settings-card" aria-labelledby="settings-library-theme"><div className="settings-card-heading"><div><h2 id="settings-library-theme">Tema da Biblioteca</h2><p>Escolha a atmosfera visual da estante, do catálogo e do dashboard.</p></div></div><div className="settings-theme-grid" role="radiogroup" aria-label="Tema da biblioteca">{availableThemes.map((item) => <button key={item.id} type="button" role="radio" aria-checked={theme.id === item.id} onClick={() => { setThemeById(item.id); notify(`Atmosfera “${item.name}” aplicada`); }}><span className={`settings-theme-preview theme-preview-${item.id}`}><i /><i /><i /></span><strong>{item.name}</strong><small>{item.id === "alice" ? "Chá, cartas e madeira clara" : item.id === "harry-potter" ? "Madeira escura e bronze" : "Gatinhos, menta, turquesa e cereja"}</small></button>)}</div></section>
      <section className="settings-card" aria-labelledby="settings-reading"><div className="settings-card-heading"><div><h2 id="settings-reading">Leitura</h2><p>Tipografia, margens, fluxo e temas por gênero são salvos por livro.</p></div><button type="button" className="settings-action" onClick={onOpenReader}>Abrir leitor</button></div></section>
      <section className="settings-card" aria-labelledby="settings-sounds"><div className="settings-card-heading"><div><h2 id="settings-sounds">Sons</h2><p>Sons ambientes são opcionais e usam volume padrão de 20%.</p></div><SilentModeButton showLabel /></div></section>
      <section className="settings-card" aria-labelledby="settings-goals"><div className="settings-card-heading"><div><h2 id="settings-goals">Metas</h2><p>Defina quantos livros você quer concluir em {new Date().getFullYear()}.</p></div><div className="settings-goal-control" aria-label="Meta anual de livros"><button type="button" onClick={() => changeGoal(annualGoal - 1)} aria-label="Diminuir meta">−</button><output aria-live="polite" aria-busy={isSaving}>{annualGoal}</output><button type="button" onClick={() => changeGoal(annualGoal + 1)} aria-label="Aumentar meta">+</button></div></div></section>
      <section className="settings-card settings-storage" aria-labelledby="settings-storage"><div className="settings-card-heading"><div><h2 id="settings-storage">Dados & modo offline</h2><p>Catálogo, preferências, progresso e anotações ficam armazenados localmente neste dispositivo.</p></div><span>SQLite local</span></div></section>
    </div>
  </main>;
}
