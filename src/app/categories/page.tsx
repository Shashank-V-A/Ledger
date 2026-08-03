import { requireUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/categories";
import { CategoryDetailList } from "@/components/CategoryDetail";
import { PageHeader } from "@/components/PageHeader";
import { getExpensesGroupedByCategory, getMonthlySummary } from "@/lib/expenses";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function CategoriesContent({ month }: { month: string }) {
  const user = await requireUser();
  const [groups, summary] = await Promise.all([
    getExpensesGroupedByCategory(month, user.id),
    getMonthlySummary(month, user.id),
  ]);

  return (
    <>
      <PageHeader
        month={month}
        title="By category"
        subtitle={`${formatCurrency(summary.totalSpent)} total · ${summary.expenseCount} transactions`}
      />

      <CategoryDetailList groups={groups} monthTotal={summary.totalSpent} />
    </>
  );
}

export default async function CategoriesPage({
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
      <CategoriesContent month={month} />
    </Suspense>
  );
}
