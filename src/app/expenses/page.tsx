import { requireUser } from "@/lib/auth";
import { getExpenses } from "@/lib/expenses";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { PageHeader } from "@/components/PageHeader";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function ExpensesContent({ month }: { month: string }) {
  const user = await requireUser();
  const expenses = await getExpenses({ month, userId: user.id });

  return (
    <>
      <PageHeader
        month={month}
        title="Expenses"
        subtitle={`${expenses.length} ${expenses.length === 1 ? "entry" : "entries"}`}
      />

      <section className="panel mb-6 animate-fade-up">
        <div className="panel-header flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-[var(--text)]">New expense</h2>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Add manually</p>
          </div>
        </div>
        <div className="panel-body">
          <AddExpenseForm />
        </div>
      </section>

      <section className="panel animate-fade-up" style={{ animationDelay: "0.05s" }}>
        <div className="panel-header">
          <h2 className="text-sm font-medium text-[var(--text)]">All entries</h2>
        </div>
        <div className="panel-body !pt-2">
          <ExpenseList expenses={expenses} />
        </div>
      </section>
    </>
  );
}

export default async function ExpensesPage({
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
      <ExpensesContent month={month} />
    </Suspense>
  );
}
