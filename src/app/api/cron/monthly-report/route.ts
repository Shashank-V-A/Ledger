import { generateInsights } from "@/lib/ai";
import { formatCurrency } from "@/lib/categories";
import {
  getBudgets,
  getExpenses,
  getMonthlySummary,
  getPreviousMonthSummary,
} from "@/lib/expenses";
import { generateMonthlyPdf } from "@/lib/pdf";
import { createServiceClient } from "@/lib/supabase/server";
import {
  sendTelegramDocument,
  sendTelegramMessage,
} from "@/lib/telegram";
import { listUsersWithTelegram } from "@/lib/users";
import { format, subMonths } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthParam = request.nextUrl.searchParams.get("month");
  const reportMonth = monthParam ?? format(subMonths(new Date(), 1), "yyyy-MM");

  try {
    const users = await listUsersWithTelegram();
    const results: { userId: string; ok: boolean; reason?: string }[] = [];

    for (const user of users) {
      try {
        const [summary, previous, expenses, budgets] = await Promise.all([
          getMonthlySummary(reportMonth, user.id),
          getPreviousMonthSummary(reportMonth, user.id),
          getExpenses({ month: reportMonth, userId: user.id }),
          getBudgets(user.id),
        ]);

        if (!expenses.length) {
          results.push({ userId: user.id, ok: true, reason: "no_expenses" });
          continue;
        }

        const topExpenses = [...expenses]
          .sort((a, b) => Number(b.amount) - Number(a.amount))
          .slice(0, 10);

        const insights = await generateInsights({
          current: {
            month: reportMonth,
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

        const supabase = createServiceClient();
        await supabase.from("monthly_reports").upsert(
          {
            report_month: `${reportMonth}-01`,
            user_id: user.id,
            total_spent: summary.totalSpent,
            total_invested: summary.totalInvested,
            insights,
            sent_at: new Date().toISOString(),
          },
          { onConflict: "user_id,report_month" }
        );

        const chatId = user.telegram_user_id;
        const monthLabel = format(new Date(`${reportMonth}-01`), "MMMM yyyy");
        const caption = [
          `📄 ${monthLabel} Report`,
          `Spent: ${formatCurrency(summary.totalSpent)}`,
          ...(summary.totalInvested > 0
            ? [`Invested: ${formatCurrency(summary.totalInvested)}`]
            : []),
        ].join("\n");

        await sendTelegramDocument(
          chatId,
          pdf,
          `expense-report-${reportMonth}.pdf`,
          caption
        );

        const insightText = insights
          .map((i) => `• ${i.title}: ${i.detail}`)
          .join("\n");
        await sendTelegramMessage(
          chatId,
          `🤖 AI Insights for ${monthLabel}\n\n${insightText}`
        );

        results.push({ userId: user.id, ok: true });
      } catch (err) {
        console.error("Monthly report user error:", user.id, err);
        results.push({
          userId: user.id,
          ok: false,
          reason: err instanceof Error ? err.message : "failed",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      month: reportMonth,
      users: results.length,
      results,
    });
  } catch (error) {
    console.error("Monthly report error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Report failed" },
      { status: 500 }
    );
  }
}
