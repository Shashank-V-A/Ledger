import { generateInsights } from "@/lib/ai";
import { formatCurrency } from "@/lib/categories";
import {
  getBudgets,
  getExpenses,
  getMonthlySummary,
  getPreviousMonthSummary,
  getYearlyData,
} from "@/lib/expenses";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { CategoryPieChart, YearlyBarChart } from "@/components/Charts";
import { InsightsList, StatCard } from "@/components/DashboardParts";
import { formatMonthLabel } from "@/lib/date-utils";
import { MonthPicker } from "@/components/MonthPicker";
import { getDaysInMonth, parseISO } from "date-fns";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function DashboardContent({ month }: { month: string }) {
  const year = parseInt(month.slice(0, 4), 10);
  const [summary, previous, expenses, budgets, yearly] = await Promise.all([
    getMonthlySummary(month),
    getPreviousMonthSummary(month),
    getExpenses({ month }),
    getBudgets(),
    getYearlyData(year),
  ]);

  const topExpenses = [...expenses]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10);

  const insights = await generateInsights({
    current: {
      month,
      totalSpent: summary.totalSpent,
      totalInvested: summary.totalInvested,
      byCategory: summary.byCategory.map((c) => ({
        category: c.category,
        total: c.total,
      })),
    },
    previous: previous
      ? {
          totalSpent: previous.totalSpent,
          byCategory: previous.byCategory.map((c) => ({
            category: c.category,
            total: c.total,
          })),
        }
      : null,
    budgets: budgets.map((b) => ({
      category: b.category,
      monthly_limit: Number(b.monthly_limit),
    })),
    topExpenses: topExpenses.map((e) => ({
      description: e.description ?? "-",
      amount: Number(e.amount),
      category: e.category,
    })),
  });

  const spentDiff = previous
    ? summary.totalSpent - previous.totalSpent
    : null;

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{formatMonthLabel(month)}</h1>
          <p className="text-slate-400">Track spending, investments, and AI insights</p>
        </div>
        <MonthPicker month={month} />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Spent"
          value={formatCurrency(summary.totalSpent)}
          sub={
            spentDiff !== null
              ? `${spentDiff >= 0 ? "+" : ""}${formatCurrency(spentDiff)} vs last month`
              : undefined
          }
          accent="text-emerald-300"
        />
        <StatCard
          label="Investments"
          value={formatCurrency(summary.totalInvested)}
          accent="text-sky-300"
        />
        <StatCard
          label="Transactions"
          value={String(summary.expenseCount)}
        />
        <StatCard
          label="Avg per day"
          value={formatCurrency(
            summary.totalSpent
              ? Math.round(
                  summary.totalSpent / getDaysInMonth(parseISO(`${month}-01`))
                )
              : 0
          )}
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Spending by Category</h2>
          <CategoryPieChart data={summary.byCategory} />
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">{year} Overview</h2>
          <YearlyBarChart data={yearly} />
        </section>
      </div>

      <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">AI Insights</h2>
        <InsightsList insights={insights} />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Add</h2>
        <AddExpenseForm />
      </section>
    </>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ?? new Date().toISOString().slice(0, 7);

  return (
    <Suspense fallback={<p className="text-slate-400">Loading dashboard...</p>}>
      <DashboardContent month={month} />
    </Suspense>
  );
}
