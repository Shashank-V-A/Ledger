import {
  CATEGORIES,
  type CategoryId,
  SPENDING_CATEGORIES,
  normalizeCategory,
  isInvestmentCategory,
} from "@/lib/categories";
import { createServiceClient } from "@/lib/supabase/server";
import type { CategorySummary, Expense, MonthlySummary } from "@/types";
import {
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";

export async function createExpense(input: {
  amount: number;
  category: CategoryId;
  description?: string;
  expense_date?: string;
  source?: "telegram" | "web";
  telegram_user_id?: number;
}): Promise<Expense> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      amount: input.amount,
      category: input.category,
      description: input.description ?? null,
      expense_date: input.expense_date ?? format(new Date(), "yyyy-MM-dd"),
      source: input.source ?? "web",
      telegram_user_id: input.telegram_user_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function getExpenses(filters?: {
  month?: string;
  category?: CategoryId;
  limit?: number;
}): Promise<Expense[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters?.month) {
    const start = startOfMonth(parseISO(`${filters.month}-01`));
    const end = endOfMonth(start);
    query = query
      .gte("expense_date", format(start, "yyyy-MM-dd"))
      .lte("expense_date", format(end, "yyyy-MM-dd"));
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Expense[];
}

export async function updateExpense(
  id: string,
  updates: Partial<Pick<Expense, "amount" | "category" | "description" | "expense_date">>
): Promise<Expense> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteLastExpense(
  telegramUserId?: number
): Promise<Expense | null> {
  const supabase = createServiceClient();
  let query = supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);

  if (telegramUserId) {
    query = query.eq("telegram_user_id", telegramUserId);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return null;

  const expense = data[0] as Expense;
  await deleteExpense(expense.id);
  return expense;
}

export async function getExpensesForDateRange(
  start: string,
  end: string
): Promise<Expense[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", start)
    .lte("expense_date", end)
    .order("expense_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Expense[];
}

function summarizeExpenses(expenses: Expense[]): MonthlySummary {
  const byCategoryMap = new Map<CategoryId, CategorySummary>();

  for (const cat of Object.keys(CATEGORIES) as CategoryId[]) {
    byCategoryMap.set(cat, { category: cat, total: 0, count: 0 });
  }

  let totalSpent = 0;
  let totalInvested = 0;

  for (const expense of expenses) {
    const category = normalizeCategory(expense.category);
    const amount = Number(expense.amount);
    const entry = byCategoryMap.get(category)!;
    entry.total += amount;
    entry.count += 1;

    totalSpent += amount;
    if (isInvestmentCategory(category)) {
      totalInvested += amount;
    }
  }

  return {
    month: "",
    totalSpent,
    totalInvested,
    byCategory: Array.from(byCategoryMap.values()).filter((c) => c.count > 0),
    expenseCount: expenses.length,
  };
}

export async function getMonthlySummary(month: string): Promise<MonthlySummary> {
  const expenses = await getExpenses({ month });
  const summary = summarizeExpenses(expenses);
  return { ...summary, month };
}

export async function getPreviousMonthSummary(
  month: string
): Promise<MonthlySummary | null> {
  const prev = subMonths(parseISO(`${month}-01`), 1);
  const prevMonth = format(prev, "yyyy-MM");
  const expenses = await getExpenses({ month: prevMonth });
  if (!expenses.length) return null;
  return { ...summarizeExpenses(expenses), month: prevMonth };
}

export async function getBudgets() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("budgets").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function upsertBudget(category: CategoryId, monthly_limit: number) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      { category, monthly_limit, updated_at: new Date().toISOString() },
      { onConflict: "category" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getYearlyData(year: number) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .gte("expense_date", `${year}-01-01`)
    .lte("expense_date", `${year}-12-31`);

  if (error) throw error;
  const expenses = (data ?? []) as Expense[];

  const months: Record<string, MonthlySummary> = {};
  for (let m = 1; m <= 12; m++) {
    const monthKey = `${year}-${String(m).padStart(2, "0")}`;
    months[monthKey] = {
      month: monthKey,
      totalSpent: 0,
      totalInvested: 0,
      byCategory: [],
      expenseCount: 0,
    };
  }

  for (const expense of expenses) {
    const monthKey = expense.expense_date.slice(0, 7);
    if (!months[monthKey]) continue;
    const amount = Number(expense.amount);
    months[monthKey].expenseCount += 1;
    months[monthKey].totalSpent += amount;
    if (isInvestmentCategory(expense.category)) {
      months[monthKey].totalInvested += amount;
    }
  }

  return Object.values(months);
}

export async function getExpensesGroupedByCategory(month: string) {
  const expenses = await getExpenses({ month });
  const groups = new Map<CategoryId, Expense[]>();

  for (const expense of expenses) {
    const category = normalizeCategory(expense.category);
    const list = groups.get(category) ?? [];
    list.push(expense);
    groups.set(category, list);
  }

  return Array.from(groups.entries())
    .map(([category, items]) => ({
      category,
      total: items.reduce((s, e) => s + Number(e.amount), 0),
      count: items.length,
      items: [...items].sort((a, b) => Number(b.amount) - Number(a.amount)),
    }))
    .sort((a, b) => b.total - a.total);
}

export { SPENDING_CATEGORIES };
