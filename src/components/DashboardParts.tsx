import { deleteExpenseAction } from "@/app/actions";
import {
  formatCurrency,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/categories";
import type { AIInsight, Expense } from "@/types";
import { Trash2, TrendingDown, TrendingUp, Minus } from "lucide-react";

export function HeroStat({
  label,
  value,
  delta,
  variant = "default",
}: {
  label: string;
  value: string;
  delta?: { amount: string; positive: boolean } | null;
  variant?: "default" | "invest" | "muted";
}) {
  const valueColor =
    variant === "invest"
      ? "text-[var(--positive)]"
      : variant === "muted"
        ? "text-[var(--text-secondary)]"
        : "text-[var(--text)]";

  return (
    <div className="panel p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`stat-value mt-3 text-4xl lg:text-5xl ${valueColor}`}>{value}</p>
      {delta && (
        <p
          className={`mt-2 flex items-center gap-1 text-sm ${
            delta.positive ? "text-[var(--negative)]" : "text-[var(--positive)]"
          }`}
        >
          {delta.positive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {delta.amount} vs last month
        </p>
      )}
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-5 py-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="stat-value mt-1.5 text-2xl text-[var(--text)]">{value}</p>
    </div>
  );
}

export function InsightsList({ insights }: { insights: AIInsight[] }) {
  if (!insights.length) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Keep logging expenses — insights appear once there&apos;s enough data.
      </p>
    );
  }

  const icons = {
    warning: <TrendingUp className="h-4 w-4 text-[var(--negative)]" />,
    positive: <TrendingDown className="h-4 w-4 text-[var(--positive)]" />,
    neutral: <Minus className="h-4 w-4 text-[var(--text-muted)]" />,
  };

  return (
    <div className="divide-y divide-[var(--border)]">
      {insights.map((insight, i) => (
        <div key={i} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-hover)]">
            {icons[insight.type]}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">{insight.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
              {insight.detail}
            </p>
          </div>
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
          className="group flex items-center gap-4 py-4 transition-colors hover:bg-[var(--bg-hover)]/50 -mx-2 px-2 rounded-xl"
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
          <p className="stat-value shrink-0 text-lg text-[var(--text)]">
            {formatCurrency(Number(expense.amount))}
          </p>
          <form action={deleteExpenseAction.bind(null, expense.id)}>
            <button
              type="submit"
              className="rounded-lg p-2 text-[var(--text-muted)] opacity-0 transition-all hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
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
