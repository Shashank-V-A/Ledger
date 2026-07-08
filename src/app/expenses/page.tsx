import { getExpenses } from "@/lib/expenses";
import { AddExpenseForm } from "@/components/AddExpenseForm";
import { ExpenseTable } from "@/components/DashboardParts";
import { formatMonthLabel, MonthPicker } from "@/components/MonthPicker";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function ExpensesContent({ month }: { month: string }) {
  const expenses = await getExpenses({ month });

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-slate-400">{formatMonthLabel(month)} — {expenses.length} entries</p>
        </div>
        <MonthPicker month={month} />
      </div>

      <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Add Expense</h2>
        <AddExpenseForm />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <ExpenseTable expenses={expenses} />
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
    <Suspense fallback={<p className="text-slate-400">Loading expenses...</p>}>
      <ExpensesContent month={month} />
    </Suspense>
  );
}
