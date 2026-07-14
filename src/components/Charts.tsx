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
    <div className="border-[3px] border-[var(--ink)] bg-white px-3 py-2 text-xs shadow-[3px_3px_0_var(--ink)]">
      <p className="font-bold uppercase text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 font-extrabold text-[var(--text)]">
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
      <div className="flex h-48 items-center justify-center border-[3px] border-dashed border-[var(--ink)] text-sm font-bold uppercase text-[var(--text-muted)]">
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
              <span className="flex items-center gap-2 font-bold text-[var(--text)]">
                <span
                  className="category-dot"
                  style={{ background: color }}
                />
                {getCategoryLabel(item.category)}
              </span>
              <span className="font-extrabold text-[var(--text)]">
                {formatCurrency(item.total)}
                <span className="ml-2 text-[var(--text-muted)]">{pct}%</span>
              </span>
            </div>
            <div className="h-3 overflow-hidden border-[2px] border-[var(--ink)] bg-white">
              <div
                className="h-full transition-all duration-500"
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
      <div className="flex h-48 items-center justify-center border-[3px] border-dashed border-[var(--ink)] text-sm font-bold uppercase text-[var(--text-muted)]">
        No yearly data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barSize={22}>
        <CartesianGrid
          strokeDasharray="0"
          stroke="rgba(10, 10, 10, 0.15)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: "#0a0a0a", fontSize: 11, fontWeight: 700 }}
          axisLine={{ stroke: "#0a0a0a", strokeWidth: 2 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#0a0a0a", fontSize: 11, fontWeight: 700 }}
          axisLine={{ stroke: "#0a0a0a", strokeWidth: 2 }}
          tickLine={false}
          tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
          width={48}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(200, 240, 77, 0.35)" }} />
        <Bar
          dataKey="spent"
          fill="#0a0a0a"
          stroke="#0a0a0a"
          strokeWidth={2}
          radius={[0, 0, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
