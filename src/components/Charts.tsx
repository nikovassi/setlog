// Recharts is only imported from here; screens load this module lazily.
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface ChartPoint {
  label: string;
  value: number;
}

const axis = { fontSize: 11, fill: 'var(--faint)' };
const tooltipStyle = {
  contentStyle: { background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13 },
  labelStyle: { color: 'var(--muted)' },
  cursor: { fill: 'var(--surface-2)' },
};

function compact(n: number): string {
  return n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n * 10) / 10);
}

interface Props {
  title: string;
  data: ChartPoint[];
  unit?: string;
  /** Accessible summary read by screen readers instead of the SVG. */
  summary: string;
}

export function LineChartCard({ title, data, unit = '', summary }: Props) {
  return (
    <figure className="card chart-card" style={{ margin: 0 }}>
      <h3>{title}</h3>
      <div className="chart-box" role="img" aria-label={`${title}. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={18} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={44} tickFormatter={compact} domain={['auto', 'auto']} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ${unit}`.trim(), title]} />
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function BarChartCard({ title, data, unit = '', summary }: Props) {
  return (
    <figure className="card chart-card" style={{ margin: 0 }}>
      <h3>{title}</h3>
      <div className="chart-box" role="img" aria-label={`${title}. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} minTickGap={12} />
            <YAxis tick={axis} tickLine={false} axisLine={false} width={44} tickFormatter={compact} allowDecimals={false} />
            <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ${unit}`.trim(), title]} />
            <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
