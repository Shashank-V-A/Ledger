import { CATEGORY_LIST } from "@/lib/categories";
import { addExpenseAction } from "@/app/actions";

export function AddExpenseForm() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={addExpenseAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input
        name="amount"
        type="number"
        min="1"
        step="0.01"
        required
        placeholder="Amount (₹)"
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
      />
      <select
        name="category"
        required
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        defaultValue="food_small"
      >
        {CATEGORY_LIST.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.label}
          </option>
        ))}
      </select>
      <input
        name="description"
        type="text"
        placeholder="Description"
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
      />
      <input
        name="expense_date"
        type="date"
        defaultValue={today}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
      />
      <button
        type="submit"
        className="rounded-lg bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400"
      >
        Add Expense
      </button>
    </form>
  );
}
