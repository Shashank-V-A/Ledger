"use client";

import { deleteExpenseAction, updateExpenseAction } from "@/app/actions";
import { CategoryBadge } from "@/components/DashboardParts";
import { CATEGORY_LIST, formatCurrency } from "@/lib/categories";
import type { Expense } from "@/types";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

export function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      const hay = `${e.description ?? ""} ${e.category} ${e.amount} ${e.expense_date}`.toLowerCase();
      return hay.includes(q);
    });
  }, [expenses, query, category]);

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
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search description, amount…"
          className="field flex-1"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="field sm:w-52"
        >
          <option value="all">All categories</option>
          {CATEGORY_LIST.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {!filtered.length ? (
        <div className="py-10 text-center text-sm text-[var(--text-muted)]">
          No matching expenses
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {filtered.map((expense) =>
            editingId === expense.id ? (
              <form
                key={expense.id}
                className="grid gap-3 py-4 sm:grid-cols-2"
                action={(formData) => {
                  startTransition(async () => {
                    await updateExpenseAction(formData);
                    setEditingId(null);
                  });
                }}
              >
                <input type="hidden" name="id" value={expense.id} />
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Amount</label>
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    defaultValue={Number(expense.amount)}
                    className="field"
                  />
                </div>
                <div className="field-wrap">
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Category</label>
                  <select
                    name="category"
                    required
                    defaultValue={expense.category}
                    className="field"
                  >
                    {CATEGORY_LIST.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Description</label>
                  <input
                    name="description"
                    type="text"
                    defaultValue={expense.description ?? ""}
                    className="field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[var(--text-muted)]">Date</label>
                  <input
                    name="expense_date"
                    type="date"
                    required
                    defaultValue={expense.expense_date}
                    className="field field-date"
                  />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <button type="submit" className="btn-primary" disabled={pending}>
                    <Check className="h-4 w-4" />
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div
                key={expense.id}
                className="group flex items-center gap-3 border-l-[3px] border-transparent py-4 transition-colors hover:border-[var(--ink)] hover:bg-[var(--bg-hover)] -mx-2 px-2 sm:gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    {expense.description ?? "—"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <CategoryBadge category={expense.category} />
                    <span className="text-xs text-[var(--text-muted)]">
                      {expense.expense_date}
                    </span>
                    <span className="text-xs capitalize text-[var(--text-muted)]">
                      · {expense.source}
                    </span>
                  </div>
                </div>
                <p className="stat-value shrink-0 text-lg text-[var(--ink)]">
                  {formatCurrency(Number(expense.amount))}
                </p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    className="delete-on-hover border-[2px] border-transparent p-2 text-[var(--text-muted)] transition-all hover:border-[var(--ink)] hover:bg-[var(--lime)] hover:text-[var(--ink)]"
                    title="Edit"
                    onClick={() => setEditingId(expense.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="delete-on-hover border-[2px] border-transparent p-2 text-[var(--text-muted)] transition-all hover:border-[var(--ink)] hover:bg-[var(--negative)] hover:text-white"
                    title="Delete"
                    disabled={pending}
                    onClick={() => {
                      const label = expense.description ?? "this expense";
                      if (
                        !window.confirm(
                          `Delete ${formatCurrency(Number(expense.amount))} — ${label}?`
                        )
                      ) {
                        return;
                      }
                      startTransition(async () => {
                        await deleteExpenseAction(expense.id);
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
