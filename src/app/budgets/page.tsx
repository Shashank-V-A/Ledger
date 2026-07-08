import { getBudgets, getMonthlySummary } from "@/lib/expenses";
import { BudgetForm } from "@/components/BudgetForm";
import {
  formatCurrency,
  getCategoryColor,
  SPENDING_CATEGORIES,
} from "@/lib/categories";
import { PageHeader } from "@/components/PageHeader";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function BudgetsContent({ month }: { month: string }) {
  const [budgets, summary] = await Promise.all([
    getBudgets(),
    getMonthlySummary(month),
  ]);

  const existing: Record<string, number> = {};
  for (const b of budgets) {
    existing[b.category] = Number(b.monthly_limit);
  }

  const spentByCategory = new Map(
    summary.byCategory.map((c) => [c.category, c.total])
  );

  return (
    <>
      <PageHeader
        month={month}
        title="Budgets"
        subtitle="Monthly spending limits"
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-2 animate-fade-up">
        {SPENDING_CATEGORIES.map((cat) => {
          const limit = existing[cat.id];
          const spent = spentByCategory.get(cat.id) ?? 0;
          const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
          const over = limit && spent > limit;
          const color = getCategoryColor(cat.id);

          return (
            <div key={cat.id} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-2 w-2 rounded-full shrink-0 mt-1"
                    style={{ background: color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-[var(--text)]">{cat.label}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {limit ? `${pct}% of budget` : "No limit set"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="stat-value text-xl text-[var(--text)]">
                    {formatCurrency(spent)}
                  </p>
                  {limit ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      of {formatCurrency(limit)}
                    </p>
                  ) : null}
                </div>
              </div>

              {limit ? (
                <div className="mt-4">
                  <div className="h-1 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: over ? "var(--negative)" : color,
                      }}
                    />
                  </div>
                  {over && (
                    <p className="mt-2 text-xs text-[var(--negative)]">
                      Over by {formatCurrency(spent - limit)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 h-1 rounded-full bg-[var(--bg-hover)]" />
              )}
            </div>
          );
        })}
      </section>

      <section className="panel animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="panel-header">
          <h2 className="text-sm font-medium text-[var(--text)]">Set limits</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Investments are tracked separately
          </p>
        </div>
        <div className="panel-body">
          <BudgetForm existing={existing} />
        </div>
      </section>
    </>
  );
}

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? new Date().toISOString().slice(0, 7);

  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
          Loading…
        </div>
      }
    >
      <BudgetsContent month={month} />
    </Suspense>
  );
}
