import {
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/categories";
import type { AIInsight } from "@/types";
import { TrendingDown, TrendingUp, Sparkles } from "lucide-react";

export function HeroStat({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta?: { amount: string; positive: boolean } | null;
  sub?: string;
}) {
  return (
    <div className="panel p-6 lg:p-8">
      <p className="inline-block border-[2px] border-[var(--ink)] bg-[var(--lime)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[var(--ink)]">
        {label}
      </p>
      <p className="stat-value mt-3 text-4xl text-[var(--text)] lg:text-5xl">{value}</p>
      {sub && (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{sub}</p>
      )}
      {delta && (
        <p
          className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${
            delta.positive ? "text-[var(--negative)]" : "text-[var(--positive)]"
          }`}
        >
          {delta.positive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {delta.amount} vs last month
        </p>
      )}
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel flex flex-col justify-center px-5 py-4">
      <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
      <p className="stat-value mt-1.5 text-2xl text-[var(--text)]">{value}</p>
    </div>
  );
}

export function InsightsList({ insights }: { insights: AIInsight[] }) {
  if (!insights.length) {
    return (
      <div className="flex flex-col items-center justify-center border-[3px] border-dashed border-[var(--ink)] bg-white py-12 text-center shadow-[3px_3px_0_var(--ink)]">
        <Sparkles className="mb-3 h-6 w-6 text-[var(--slap)]" strokeWidth={2.5} />
        <p className="text-sm font-extrabold uppercase text-[var(--text)]">No insights yet</p>
        <p className="mt-1 text-xs font-semibold text-[var(--text-muted)]">
          Log a few more expenses to unlock patterns
        </p>
      </div>
    );
  }

  const styles = {
    warning: "insight-card insight-card--warning",
    positive: "insight-card insight-card--positive",
    neutral: "insight-card insight-card--neutral",
  };

  const labels = {
    warning: "Watch",
    positive: "Good",
    neutral: "Note",
  };

  const labelColors = {
    warning: "text-[var(--negative)]",
    positive: "text-[var(--positive)]",
    neutral: "text-[var(--accent)]",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {insights.map((insight, i) => (
        <div key={i} className={styles[insight.type]}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${labelColors[insight.type]}`}>
              {labels[insight.type]}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
          <p className="text-sm font-semibold leading-snug text-[var(--text)]">
            {insight.title}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {insight.detail}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const color = getCategoryColor(category);
  return (
    <span className="category-pill">
      <span className="category-dot" style={{ background: color }} />
      {getCategoryLabel(category)}
    </span>
  );
}

