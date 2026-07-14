"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, subMonths, addMonths } from "date-fns";

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(newMonth: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth);
    router.push(`?${params.toString()}`);
  }

  function shift(delta: number) {
    const d = parseISO(`${month}-01`);
    const shifted = delta > 0 ? addMonths(d, 1) : subMonths(d, 1);
    navigate(format(shifted, "yyyy-MM"));
  }

  return (
    <div className="flex items-center gap-0 border-[3px] border-[var(--ink)] bg-white shadow-[3px_3px_0_var(--ink)]">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="border-r-[3px] border-[var(--ink)] bg-white p-2 font-bold hover:bg-[var(--lime)]"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={3} />
      </button>
      <div className="month-picker-field px-1">
        <input
          type="month"
          value={month}
          onChange={(e) => navigate(e.target.value)}
          className="field !border-none !bg-transparent !px-2 text-sm font-bold !shadow-none focus:!shadow-none focus:!transform-none"
        />
      </div>
      <button
        type="button"
        onClick={() => shift(1)}
        className="border-l-[3px] border-[var(--ink)] bg-white p-2 font-bold hover:bg-[var(--lime)]"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={3} />
      </button>
    </div>
  );
}
