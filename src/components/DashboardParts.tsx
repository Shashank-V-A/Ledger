import { deleteExpenseAction } from "@/app/actions";
import {
  formatCurrency,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/categories";
import type { AIInsight, Expense } from "@/types";
import { Trash2, TrendingDown, TrendingUp, Sparkles } from "lucide-react";

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
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
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
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] py-12 text-center">
        <Sparkles className="mb-3 h-6 w-6 text-[var(--accent)] opacity-60" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">No insights yet</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
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

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  if (!expenses.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm font-medium text-[var(--text-secondary)]">No expenses yet</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Log via Telegram or use the form above
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="group flex items-center gap-4 py-4 transition-colors hover:bg-[var(--bg-hover)]/60 -mx-2 px-2 rounded-xl"
        >
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-[var(--text)]">
              {expense.description ?? "—"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <CategoryBadge category={expense.category} />
              <span className="text-xs text-[var(--text-muted)]">{expense.expense_date}</span>
              <span className="text-xs capitalize text-[var(--text-muted)]">· {expense.source}</span>
            </div>
          </div>
          <p className="stat-value shrink-0 text-lg text-[var(--accent)]">
            {formatCurrency(Number(expense.amount))}
          </p>
          <form action={deleteExpenseAction.bind(null, expense.id)}>
            <button
              type="submit"
              className="rounded-lg p-2 text-[var(--text-muted)] opacity-0 transition-all hover:bg-[var(--negative-soft)] hover:text-[var(--negative)] group-hover:opacity-100"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
