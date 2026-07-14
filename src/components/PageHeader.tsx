import { formatMonthLabel } from "@/lib/date-utils";
import { MonthPicker } from "@/components/MonthPicker";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  month,
  actions,
}: {
  title: string;
  subtitle?: string;
  month: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-wrap items-end justify-between gap-6 animate-fade-up">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          {formatMonthLabel(month)}
        </p>
        <h1 className="font-[family-name:var(--font-bricolage)] text-3xl font-semibold tracking-tight text-[var(--text)] lg:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <MonthPicker month={month} />
      </div>
    </header>
  );
}
