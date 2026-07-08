import { getBudgets, getMonthlySummary } from "@/lib/expenses";
import { BudgetForm } from "@/components/BudgetForm";
import { formatCurrency, SPENDING_CATEGORIES } from "@/lib/categories";
import { formatMonthLabel } from "@/lib/date-utils";
import { MonthPicker } from "@/components/MonthPicker";
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets</h1>
          <p className="text-slate-400">Set monthly limits and track overruns for {formatMonthLabel(month)}</p>
        </div>
        <MonthPicker month={month} />
      </div>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SPENDING_CATEGORIES.map((cat) => {
          const limit = existing[cat.id];
          const spent = spentByCategory.get(cat.id) ?? 0;
          const pct = limit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
          const over = limit && spent > limit;

          return (
            <div
              key={cat.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
            >
              <p className="text-sm text-slate-400">{cat.label}</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {formatCurrency(spent)}
                {limit ? (
                  <span className="text-sm font-normal text-slate-500">
                    {" "}/ {formatCurrency(limit)}
                  </span>
                ) : null}
              </p>
              {limit ? (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full ${over ? "bg-red-400" : "bg-emerald-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={`mt-1 text-xs ${over ? "text-red-300" : "text-slate-500"}`}>
                    {over
                      ? `Over by ${formatCurrency(spent - limit)}`
                      : `${pct}% used`}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No budget set</p>
              )}
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Set Budget Limits</h2>
        <BudgetForm existing={existing} />
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
    <Suspense fallback={<p className="text-slate-400">Loading budgets...</p>}>
      <BudgetsContent month={month} />
    </Suspense>
  );
}
