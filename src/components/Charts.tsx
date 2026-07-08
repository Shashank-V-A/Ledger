"use client";

import {
  CATEGORIES,
  formatCurrency,
  getCategoryLabel,
} from "@/lib/categories";
import type { CategorySummary } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function CategoryPieChart({ data }: { data: CategorySummary[] }) {
  const chartData = data
    .filter((d) => d.total > 0 && !CATEGORIES[d.category].isInvestment)
    .map((d) => ({
      name: getCategoryLabel(d.category),
      value: d.total,
      color: CATEGORIES[d.category].color,
    }));

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        No spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function YearlyBarChart({
  data,
}: {
  data: { month: string; totalSpent: number }[];
}) {
  const chartData = data.map((d) => ({
    month: d.month.slice(5),
    spent: d.totalSpent,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `₹${v / 1000}k`} />
        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        <Bar dataKey="spent" fill="#34d399" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
