import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { loadReadingStatistics, type ReadingStatistics } from "@/entities/reading-activity";
import { useTheme } from "@/hooks/useTheme";
import "./statistics.css";

const ReadingChart = lazy(() => import("./ReadingChart").then((module) => ({ default: module.ReadingChart })));
interface StatisticsPageProps { onBack: () => void }

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}min`;
  return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
}

export function StatisticsPage({ onBack }: StatisticsPageProps) {
  const { theme } = useTheme();
  const [statistics, setStatistics] = useState<ReadingStatistics | null>(null);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<7 | 30>(30);

  useEffect(() => {
    let active = true;
    void loadReadingStatistics().then((value) => active && setStatistics(value)).catch((reason: unknown) => { console.error("Falha ao carregar estatísticas:", reason); if (active) setError(true); });
    return () => { active = false; };
  }, []);

  const goalProgress = statistics ? Math.min(100, (statistics.booksCompletedThisYear / statistics.annualGoal) * 100) : 0;
  const periodData = useMemo(() => statistics?.daily.slice(-period) ?? [], [period, statistics]);
  const activeDays = periodData.filter((day) => day.minutes > 0);
  const averageMinutes = activeDays.length ? Math.round(activeDays.reduce((sum, day) => sum + day.minutes, 0) / activeDays.length) : 0;
  const bestDay = activeDays.reduce<(typeof activeDays)[number] | null>((best, day) => !best || day.minutes > best.minutes ? day : best, null);

  return <main className="statistics-page">
    <header className="statistics-header"><button type="button" onClick={onBack} aria-label="Voltar à biblioteca"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button><div><p>Seu ritmo</p><h1>Estatísticas de Leitura</h1></div></header>
    <div className="statistics-content">
      {!statistics && !error ? <p className="statistics-state">Calculando sua jornada…</p> : null}
      {error ? <p className="statistics-state">As estatísticas não puderam ser carregadas. Volte e tente novamente.</p> : null}
      {statistics ? <>
        <section className="statistics-card-grid" aria-label="Resumo de leitura"><article><strong>{formatDuration(statistics.totalSeconds)}</strong><span>Tempo total</span></article><article><strong>{statistics.pagesToday}</strong><span>Páginas hoje</span></article><article className="statistics-streak"><strong>{statistics.currentStreak}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.5c.5 3.4-2.7 4.6-1.1 7.3.6 1 1.8 1.2 2.7.4 1.5-1.3 1.6-3.2 1.3-4.6 2.5 2.1 4.1 5 3.2 8.2-.9 3.3-3.7 5.5-7.2 5.5-4.4 0-7.7-3-7.7-7.3 0-3.2 1.8-6.2 4.8-8.1-.2 2.2.2 4.2 1.7 5.2-.3-3.6 1.1-6.2 3.5-7.2Z" /></svg></strong><span>Streak atual</span></article><article><strong>{statistics.booksCompletedThisYear}</strong><span>Livros no ano</span></article></section>
        <section className="statistics-insight" aria-label="Resumo do período"><div><span aria-hidden="true">↗</span><p><strong>{activeDays.length ? `Você leu em ${activeDays.length} dias neste período.` : "Sua próxima sessão começa a construir este histórico."}</strong>{bestDay ? ` Melhor ritmo em ${bestDay.label}: ${bestDay.minutes} minutos.` : " Abra uma leitura para iniciar."}</p></div><dl><div><dt>Média por dia ativo</dt><dd>{averageMinutes} min</dd></div><div><dt>Melhor sessão</dt><dd>{bestDay?.minutes ?? 0} min</dd></div></dl></section>
        <section className="statistics-panel"><div className="statistics-section-heading"><div><p>Ritmo recente</p><h2>Leitura por dia</h2></div><div className="statistics-period-tabs" role="tablist" aria-label="Período do gráfico"><button type="button" role="tab" aria-selected={period === 7} onClick={() => setPeriod(7)}>7 dias</button><button type="button" role="tab" aria-selected={period === 30} onClick={() => setPeriod(30)}>30 dias</button></div></div><Suspense fallback={<div className="statistics-chart-loading">Preparando gráfico…</div>}><ReadingChart data={periodData} accent={theme.colors.accent} /></Suspense></section>
        <section className="statistics-panel statistics-goal"><div className="statistics-section-heading"><div><p>{new Date().getFullYear()}</p><h2>Meta de leitura</h2></div><strong>{statistics.booksCompletedThisYear} de {statistics.annualGoal} livros</strong></div><div className="statistics-goal-track" aria-label={`${Math.round(goalProgress)}% da meta anual`}><div style={{ width: `${goalProgress}%`, background: theme.colors.accent }} /></div></section>
      </> : null}
    </div>
  </main>;
}
