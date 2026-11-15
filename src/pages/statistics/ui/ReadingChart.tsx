import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyReadingStat } from "@/entities/reading-activity";

interface ReadingChartProps {
  data: DailyReadingStat[];
  accent: string;
}

export function ReadingChart({ data, accent }: ReadingChartProps) {
  return (
    <div className="statistics-chart-frame" role="img" aria-label="Minutos lidos por dia nos últimos 30 dias">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--theme-color-text-secondary)" strokeOpacity={0.28} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={4}
            tick={{ fill: "var(--theme-color-text-secondary)", fontSize: 10 }}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--theme-color-text-secondary)", fontSize: 10 }} />
          <Tooltip
            cursor={{ fill: accent, fillOpacity: 0.06 }}
            contentStyle={{ color: "var(--theme-color-text)", background: "var(--theme-color-surface)", border: "1px solid var(--theme-color-text-secondary)", borderRadius: 10, boxShadow: "0 8px 28px rgb(0 0 0 / 16%)", fontSize: 12 }}
            formatter={(value) => [`${Number(value)} min`, "Leitura"]}
            labelFormatter={(label) => `Dia ${label}`}
          />
          <Bar dataKey="minutes" fill={accent} stroke="var(--theme-color-text)" strokeWidth={0.6} radius={[5, 5, 1, 1]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
