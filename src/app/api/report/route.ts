import { generateInsights } from "@/lib/ai";
import {
  getExpenses,
  getMonthlySummary,
  getPreviousMonthSummary,
} from "@/lib/expenses";
import { generateMonthlyPdf } from "@/lib/pdf";
import { format } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-ledger-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month =
    request.nextUrl.searchParams.get("month") ??
    format(new Date(), "yyyy-MM");

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }

  try {
    const [summary, previous, expenses] = await Promise.all([
      getMonthlySummary(month, userId),
      getPreviousMonthSummary(month, userId),
      getExpenses({ month, userId }),
    ]);

    if (!expenses.length) {
      return NextResponse.json(
        { error: "No expenses for this month" },
        { status: 404 }
      );
    }

    const topExpenses = [...expenses]
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 10);

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
      budgets: [],
      topExpenses: topExpenses.map((e) => ({
        description: e.description ?? "-",
        amount: Number(e.amount),
        category: e.category,
      })),
    });

    const pdf = generateMonthlyPdf({
      summary,
      previousSummary: previous,
      insights,
      topExpenses,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="expense-report-${month}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report failed" },
      { status: 500 }
    );
  }
}
