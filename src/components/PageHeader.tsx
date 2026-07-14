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
        <p className="mb-1 inline-block border-[2px] border-[var(--ink)] bg-[var(--slap)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white">
          {formatMonthLabel(month)}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-syne)] text-4xl font-extrabold uppercase tracking-tight text-[var(--text)] lg:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm font-semibold text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <MonthPicker month={month} />
      </div>
    </header>
  );
}
