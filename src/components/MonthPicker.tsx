"use client";

import { format, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <input
      type="month"
      value={month}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
    />
  );
}

export function formatMonthLabel(month: string) {
  return format(parseISO(`${month}-01`), "MMMM yyyy");
}
