"use client";

import {
  formatCurrency,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/categories";
import type { CategorySummary } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-3 py-2 text-xs shadow-xl">
      <p className="text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 font-semibold text-[var(--text)]">
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

export function CategoryBreakdown({ data }: { data: CategorySummary[] }) {
  const items = data
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  const total = items.reduce((s, i) => s + i.total, 0);

  if (!items.length) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--text-muted)]">
        No spending recorded yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const pct = total ? Math.round((item.total / total) * 100) : 0;
        const color = getCategoryColor(item.category);
        return (
          <div key={item.category}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                <span className="category-dot" style={{ background: color }} />
                {getCategoryLabel(item.category)}
              </span>
              <span className="font-medium text-[var(--text)]">
                {formatCurrency(item.total)}
                <span className="ml-2 text-[var(--text-muted)]">{pct}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function YearlyBarChart({
  data,
}: {
  data: { month: string; totalSpent: number }[];
}) {
  const chartData = data.map((d) => ({
    month: MONTHS[parseInt(d.month.slice(5), 10) - 1],
    spent: d.totalSpent,
  }));

  const hasData = chartData.some((d) => d.spent > 0);

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-[var(--text-muted)]">
        No yearly data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barSize={20}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "#63636e", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#63636e", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
        <Bar
          dataKey="spent"
          fill="#6ea8fe"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
