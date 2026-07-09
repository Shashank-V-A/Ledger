import { CATEGORY_LIST } from "@/lib/categories";
import { addExpenseAction } from "@/app/actions";
import { Plus } from "lucide-react";

export function AddExpenseForm({ compact = false }: { compact?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={addExpenseAction}
      className={
        compact
          ? "flex flex-wrap items-end gap-3"
          : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12"
      }
    >
      <div className={compact ? "" : "min-w-0 lg:col-span-2"}>
        {!compact && (
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
            Amount
          </label>
        )}
        <input
          name="amount"
          type="number"
          min="1"
          step="0.01"
          required
          placeholder="₹ 0"
          className="field"
        />
      </div>

      <div className={compact ? "field-wrap min-w-[160px]" : "field-wrap min-w-0 lg:col-span-3"}>
        {!compact && (
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
            Category
          </label>
        )}
        <select name="category" required className="field" defaultValue="food_small">
          {CATEGORY_LIST.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>
        </div>

      <div className={compact ? "flex-1 min-w-[140px]" : "min-w-0 lg:col-span-3"}>
        {!compact && (
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
            Description
          </label>
        )}
        <input
          name="description"
          type="text"
          placeholder="What was it for?"
          className="field"
        />
      </div>

      <div className={compact ? "" : "min-w-0 lg:col-span-2"}>
        {!compact && (
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
            Date
          </label>
        )}
        <input
          name="expense_date"
          type="date"
          defaultValue={today}
          className="field field-date"
        />
      </div>

      <div className={compact ? "" : "lg:col-span-2 flex items-end"}>
        <button type="submit" className="btn-primary w-full">
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
    </form>
  );
}
