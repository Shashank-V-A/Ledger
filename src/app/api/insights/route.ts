import {
  getMonthlySummary,
  getPreviousMonthSummary,
  getExpenses,
  getBudgets,
} from "@/lib/expenses";
import { generateInsights } from "@/lib/ai";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-ledger-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month =
    request.nextUrl.searchParams.get("month") ??
    new Date().toISOString().slice(0, 7);

  const [summary, previous, expenses, budgets] = await Promise.all([
    getMonthlySummary(month, userId),
    getPreviousMonthSummary(month, userId),
    getExpenses({ month, userId }),
    getBudgets(userId),
  ]);

  const topExpenses = [...expenses]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10)
    .map((e) => ({
      description: e.description ?? "-",
      amount: Number(e.amount),
      category: e.category,
    }));

  const insights = await generateInsights({
    current: {
      month,
      totalSpent: summary.totalSpent,
      totalInvested: summary.totalInvested,
      byCategory: summary.byCategory.map((c) => ({
        category: c.category,
        total: c.total,
      })),
    },
    previous: previous
      ? {
          totalSpent: previous.totalSpent,
          byCategory: previous.byCategory.map((c) => ({
            category: c.category,
            total: c.total,
          })),
        }
      : null,
    budgets: budgets.map((b) => ({
      category: b.category,
      monthly_limit: Number(b.monthly_limit),
    })),
    topExpenses,
  });

  return NextResponse.json({
    summary,
    previous,
    insights,
    topExpenses: expenses.slice(0, 10),
  });
}
