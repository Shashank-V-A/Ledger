import { SPENDING_CATEGORIES, getCategoryColor } from "@/lib/categories";
import { saveBudgetAction } from "@/app/actions";

export function BudgetForm({
  existing,
}: {
  existing: Record<string, number>;
}) {
  return (
    <div className="space-y-2">
      {SPENDING_CATEGORIES.map((cat) => (
        <form
          key={cat.id}
          action={saveBudgetAction}
          className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3.5 transition-colors hover:border-[var(--border-strong)]"
        >
          <input type="hidden" name="category" value={cat.id} />
          <div className="flex min-w-[180px] flex-1 items-center gap-3">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: getCategoryColor(cat.id) }}
            />
            <div>
              <p className="text-sm font-medium text-[var(--text)]">{cat.label}</p>
              <p className="text-xs text-[var(--text-muted)]">Monthly limit</p>
            </div>
          </div>
          <input
            name="monthly_limit"
            type="number"
            min="1"
            step="100"
            defaultValue={existing[cat.id] ?? ""}
            placeholder="₹ 0"
            className="field w-32"
          />
          <button type="submit" className="btn-ghost text-xs">
            Save
          </button>
        </form>
      ))}
    </div>
  );
}
