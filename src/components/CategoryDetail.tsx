import {
  formatCurrency,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/categories";
import type { Expense } from "@/types";
import type { CategoryId } from "@/lib/categories";

export function CategoryDetailList({
  groups,
  monthTotal,
}: {
  groups: {
    category: CategoryId;
    total: number;
    count: number;
    items: Expense[];
  }[];
  monthTotal: number;
}) {
  if (!groups.length) {
    return (
      <div className="panel flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium text-[var(--text-secondary)]">No expenses this month</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Log via Telegram or add an expense manually
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const pct = monthTotal ? Math.round((group.total / monthTotal) * 100) : 0;
        const color = getCategoryColor(group.category);

        return (
          <section key={group.category} className="panel overflow-hidden">
            <div
              className="panel-header flex flex-wrap items-center justify-between gap-3"
              style={{ borderLeft: `4px solid ${color}` }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ background: color }}
                />
                <div>
                  <h2 className="text-base font-semibold text-[var(--text)]">
                    {getCategoryLabel(group.category)}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {group.count} {group.count === 1 ? "entry" : "entries"} · {pct}% of total
                  </p>
                </div>
              </div>
              <p className="stat-value text-2xl text-[var(--teal-dark)]">
                {formatCurrency(group.total)}
              </p>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {group.items.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[var(--bg-hover)]/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {expense.description?.trim() || "—"}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {expense.expense_date}
                      <span className="mx-1.5">·</span>
                      <span className="capitalize">{expense.source}</span>
                    </p>
                  </div>
                  <p className="stat-value shrink-0 text-base text-[var(--teal)]">
                    {formatCurrency(Number(expense.amount))}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
