import { deleteExpenseAction } from "@/app/actions";
import { formatCurrency, getCategoryLabel } from "@/lib/categories";
import type { AIInsight, Expense } from "@/types";
import { Trash2 } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ?? "text-white"}`}>{value}</p>
      {sub && <p className="mt-1 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

export function InsightsList({ insights }: { insights: AIInsight[] }) {
  if (!insights.length) {
    return <p className="text-slate-500">Log more expenses to get AI insights.</p>;
  }

  const colors = {
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    positive: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    neutral: "border-slate-600 bg-slate-800/50 text-slate-200",
  };

  return (
    <div className="space-y-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className={`rounded-xl border p-4 ${colors[insight.type]}`}
        >
          <p className="font-medium">{insight.title}</p>
          <p className="mt-1 text-sm opacity-90">{insight.detail}</p>
        </div>
      ))}
    </div>
  );
}

export function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  if (!expenses.length) {
    return (
      <p className="py-8 text-center text-slate-500">
        No expenses yet. Log via Telegram or add one below.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400">
            <th className="px-3 py-3 font-medium">Date</th>
            <th className="px-3 py-3 font-medium">Description</th>
            <th className="px-3 py-3 font-medium">Category</th>
            <th className="px-3 py-3 font-medium">Amount</th>
            <th className="px-3 py-3 font-medium">Source</th>
            <th className="px-3 py-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-b border-slate-800/60">
              <td className="px-3 py-3 text-slate-300">{expense.expense_date}</td>
              <td className="px-3 py-3 text-white">{expense.description ?? "-"}</td>
              <td className="px-3 py-3 text-slate-300">
                {getCategoryLabel(expense.category)}
              </td>
              <td className="px-3 py-3 font-medium text-emerald-300">
                {formatCurrency(Number(expense.amount))}
              </td>
              <td className="px-3 py-3 capitalize text-slate-500">{expense.source}</td>
              <td className="px-3 py-3">
                <form action={deleteExpenseAction.bind(null, expense.id)}>
                  <button
                    type="submit"
                    className="rounded p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
