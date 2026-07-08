import { format, parseISO } from "date-fns";

export function formatMonthLabel(month: string) {
  return format(parseISO(`${month}-01`), "MMMM yyyy");
}
