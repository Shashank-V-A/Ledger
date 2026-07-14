import { generateInsights } from "@/lib/ai";
import { formatCurrency } from "@/lib/categories";
import {
  getExpenses,
  getMonthlySummary,
  getPreviousMonthSummary,
  getYearlyData,
} from "@/lib/expenses";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { CategoryBreakdown, YearlyBarChart } from "@/components/Charts";
import { DownloadReportButton } from "@/components/DownloadReportButton";
import { HeroStat, InsightsList, MiniStat } from "@/components/DashboardParts";
import { PageHeader } from "@/components/PageHeader";
import {
  format,
  getDate,
  getDaysInMonth,
  parseISO,
} from "date-fns";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

function daysForAverage(month: string): number {
  const monthStart = parseISO(`${month}-01`);
  const today = new Date();
  const isCurrentMonth = format(today, "yyyy-MM") === month;
  if (isCurrentMonth) return Math.max(1, getDate(today));
  return getDaysInMonth(monthStart);
}

async function DashboardContent({ month }: { month: string }) {
  const year = parseInt(month.slice(0, 4), 10);
  const [summary, previous, expenses, yearly] = await Promise.all([
    getMonthlySummary(month),
    getPreviousMonthSummary(month),
    getExpenses({ month }),
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
    budgets: [],
    topExpenses: topExpenses.map((e) => ({
      description: e.description ?? "-",
      amount: Number(e.amount),
      category: e.category,
    })),
  });

  const spentDiff = previous
    ? summary.totalSpent - previous.totalSpent
    : null;
  const days = daysForAverage(month);
  const avgPerDay = summary.totalSpent
    ? Math.round(summary.totalSpent / days)
    : 0;

  return (
    <>
      <PageHeader
        month={month}
        title="Overview"
        subtitle={`${summary.expenseCount} transactions this month`}
        actions={<DownloadReportButton month={month} />}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-12 animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="lg:col-span-7">
          <HeroStat
            label="Total spent"
            value={formatCurrency(summary.totalSpent)}
            sub="Excludes investments"
            delta={
              spentDiff !== null
                ? {
                    amount: `${spentDiff >= 0 ? "+" : ""}${formatCurrency(spentDiff)}`,
                    positive: spentDiff > 0,
                  }
                : null
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-5">
          <MiniStat
            label="Invested"
            value={formatCurrency(summary.totalInvested)}
          />
          <MiniStat label="Daily average" value={formatCurrency(avgPerDay)} />
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2 animate-fade-up" style={{ animationDelay: "0.1s" }}>
        <section className="panel">
          <div className="panel-header flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">By category</h2>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                Spending and investments
              </p>
            </div>
            <Link
              href={`/categories?month=${month}`}
              className="text-xs font-extrabold uppercase tracking-wide text-[var(--slap)] hover:underline shrink-0"
            >
              View details →
            </Link>
          </div>
          <div className="panel-body">
            <CategoryBreakdown data={summary.byCategory} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="text-sm font-semibold text-[var(--text)]">{year} at a glance</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Monthly spending (excl. investments)
            </p>
          </div>
          <div className="panel-body">
            <YearlyBarChart data={yearly} />
          </div>
        </section>
      </div>

      <section className="mb-6 animate-fade-up" style={{ animationDelay: "0.15s" }}>
        <div className="mb-4">
          <h2 className="font-[family-name:var(--font-syne)] text-xl font-extrabold uppercase tracking-tight text-[var(--text)]">
            Insights
          </h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            AI-powered patterns from your spending
          </p>
        </div>
        <InsightsList insights={insights} />
      </section>

      <section className="panel animate-fade-up" style={{ animationDelay: "0.2s" }}>
        <div className="panel-header">
          <h2 className="text-sm font-semibold text-[var(--text)]">Quick add</h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">Or log via Telegram anytime</p>
        </div>
        <div className="panel-body">
          <AddExpenseForm />
        </div>
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
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center text-sm text-[var(--text-muted)]">
          Loading…
        </div>
      }
    >
      <DashboardContent month={month} />
    </Suspense>
  );
}
