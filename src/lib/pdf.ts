import {
  CATEGORIES,
  formatCurrency,
  getCategoryLabel,
  normalizeCategory,
} from "@/lib/categories";
import type { AIInsight, Expense, MonthlySummary } from "@/types";
import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function generateMonthlyPdf(input: {
  summary: MonthlySummary;
  previousSummary: MonthlySummary | null;
  insights: AIInsight[];
  topExpenses: Expense[];
}): Buffer {
  const doc = new jsPDF();
  const { summary, previousSummary, insights, topExpenses } = input;
  const monthLabel = format(parseISO(`${summary.month}-01`), "MMMM yyyy");

  doc.setFontSize(20);
  doc.text("Monthly Expense Report", 14, 22);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(monthLabel, 14, 30);

  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.text(`Total Expenditure: ${formatCurrency(summary.totalSpent)}`, 14, 42);
  if (summary.totalInvested > 0) {
    doc.text(`(includes ${formatCurrency(summary.totalInvested)} investments)`, 14, 50);
  }
  doc.text(`Transactions: ${summary.expenseCount}`, 14, summary.totalInvested > 0 ? 58 : 50);

  if (previousSummary) {
    const diff = summary.totalSpent - previousSummary.totalSpent;
    const sign = diff >= 0 ? "+" : "";
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(
      `vs last month: ${sign}${formatCurrency(diff)}`,
      14,
      66
    );
    doc.setTextColor(0);
  }

  const categoryRows = summary.byCategory
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((c) => [
      getCategoryLabel(c.category),
      CATEGORIES[normalizeCategory(c.category)].isInvestment ? "Investment" : "Spending",
      formatCurrency(c.total),
      String(c.count),
    ]);

  autoTable(doc, {
    startY: 74,
    head: [["Category", "Type", "Amount", "Count"]],
    body: categoryRows,
    theme: "striped",
    headStyles: { fillColor: [30, 41, 59] },
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (topExpenses.length) {
    doc.setFontSize(13);
    doc.text("Top Expenses", 14, finalY);
    autoTable(doc, {
      startY: finalY + 4,
      head: [["Description", "Category", "Amount", "Date"]],
      body: topExpenses.slice(0, 10).map((e) => [
        e.description ?? "-",
        getCategoryLabel(e.category),
        formatCurrency(Number(e.amount)),
        e.expense_date,
      ]),
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
    });
  }

  const insightsY =
    (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  doc.setFontSize(13);
  doc.text("AI Insights", 14, insightsY);
  doc.setFontSize(10);
  let y = insightsY + 8;
  for (const insight of insights) {
    const lines = doc.splitTextToSize(`• ${insight.title}: ${insight.detail}`, 180);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 3;
    if (y > 270) break;
  }

  return Buffer.from(doc.output("arraybuffer"));
}
