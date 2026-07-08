import { SPENDING_CATEGORIES } from "@/lib/categories";
import { saveBudgetAction } from "@/app/actions";

export function BudgetForm({
  existing,
}: {
  existing: Record<string, number>;
}) {
  return (
    <div className="space-y-4">
      {SPENDING_CATEGORIES.map((cat) => (
        <form
          key={cat.id}
          action={saveBudgetAction}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4"
        >
          <input type="hidden" name="category" value={cat.id} />
          <div className="min-w-[200px] flex-1">
            <p className="font-medium text-white">{cat.label}</p>
            <p className="text-xs text-slate-500">Monthly spending limit</p>
          </div>
          <input
            name="monthly_limit"
            type="number"
            min="1"
            step="100"
            defaultValue={existing[cat.id] ?? ""}
            placeholder="₹ limit"
            className="w-36 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
          <button
            type="submit"
            className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10"
          >
            Save
          </button>
        </form>
      ))}
      <p className="text-sm text-slate-500">
        Investments are tracked separately and are not included in spending budgets.
      </p>
    </div>
  );
}
