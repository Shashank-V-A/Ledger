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
      <div className="flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-white px-1 py-1 shadow-sm">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="btn-ghost !p-2"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="month-picker-field">
        <input
          type="month"
          value={month}
          onChange={(e) => navigate(e.target.value)}
          className="field !border-none !bg-transparent !px-2 text-sm font-semibold !shadow-none focus:!shadow-none"
        />
      </div>
      <button
        type="button"
        onClick={() => shift(1)}
        className="btn-ghost !p-2"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
