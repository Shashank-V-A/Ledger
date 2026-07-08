import type { CategoryId } from "@/lib/categories";

export interface Expense {
  id: string;
  amount: number;
  category: CategoryId;
  description: string | null;
  expense_date: string;
  source: "telegram" | "web";
  telegram_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  category: CategoryId;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface CategorySummary {
  category: CategoryId;
  total: number;
  count: number;
}

export interface MonthlySummary {
  month: string;
  totalSpent: number;
  totalInvested: number;
  byCategory: CategorySummary[];
  expenseCount: number;
}

export interface ParsedExpense {
  amount: number;
  category: CategoryId;
  description: string;
}

export interface AIInsight {
  title: string;
  detail: string;
  type: "warning" | "positive" | "neutral";
}
