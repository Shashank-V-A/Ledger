import {
  CATEGORIES,
  getCategoryLabel,
  normalizeCategory,
} from "@/lib/categories";
import type { AIInsight, Expense, MonthlySummary } from "@/types";
import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

/** Brutal ledger palette (matches web UI) */
const INK: [number, number, number] = [10, 10, 10];
const LIME: [number, number, number] = [200, 240, 77];
const PAPER: [number, number, number] = [255, 253, 242];
const SLAP: [number, number, number] = [255, 90, 31];
const WHITE: [number, number, number] = [255, 255, 255];
const MUTED: [number, number, number] = [74, 74, 74];
const POSITIVE: [number, number, number] = [11, 122, 59];
const NEGATIVE: [number, number, number] = [225, 6, 0];

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

function formatPdfCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(abs);
  return amount < 0 ? `-Rs. ${formatted}` : `Rs. ${formatted}`;
}

function sanitizePdfText(text: string): string {
  return text
    .replace(/\u20B9/g, "Rs. ")
    .replace(/₹\s*/g, "Rs. ")
    .replace(/\bINR\s*/gi, "Rs. ")
    .replace(/[\u00A0\u2000-\u200B]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function drawLeftAlignedLines(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(sanitizePdfText(text), maxWidth);
  for (const line of lines) {
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawHardRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: [number, number, number],
  shadowOffset = 3
) {
  doc.setFillColor(...INK);
  doc.rect(x + shadowOffset, y + shadowOffset, w, h, "F");
  doc.setFillColor(...fill);
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.2);
  doc.rect(x, y, w, h, "FD");
}

function drawPageFooter(doc: jsPDF, page: number, total: number) {
  const y = 287;
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, y - 6, PAGE_W - MARGIN, y - 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK);
  doc.text(`LEDGER · ${format(new Date(), "dd MMM yyyy").toUpperCase()}`, MARGIN, y);
  doc.text(`${page} / ${total}`, PAGE_W - MARGIN, y, { align: "right" });
}

function drawHeader(
  doc: jsPDF,
  monthLabel: string,
  summary: MonthlySummary,
  previousSummary: MonthlySummary | null
): number {
  // Full-bleed lime header band
  doc.setFillColor(...LIME);
  doc.rect(0, 0, PAGE_W, 44, "F");
  doc.setFillColor(...INK);
  doc.rect(0, 44, PAGE_W, 4, "F");

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("LEDGER", MARGIN, 20);

  doc.setFontSize(10);
  doc.text("MONTHLY EXPENSE REPORT", MARGIN, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(monthLabel.toUpperCase(), PAGE_W - MARGIN, 22, { align: "right" });

  let y = 60;

  const stats: { label: string; value: string; fill: [number, number, number] }[] = [
    { label: "TOTAL SPENT", value: formatPdfCurrency(summary.totalSpent), fill: WHITE },
    { label: "TRANSACTIONS", value: String(summary.expenseCount), fill: PAPER },
  ];

  if (summary.totalInvested > 0) {
    stats.push({
      label: "INVESTMENTS",
      value: formatPdfCurrency(summary.totalInvested),
      fill: LIME,
    });
  }

  if (previousSummary) {
    const diff = summary.totalSpent - previousSummary.totalSpent;
    const sign = diff >= 0 ? "+" : "";
    stats.push({
      label: "VS LAST MONTH",
      value: `${sign}${formatPdfCurrency(diff)}`,
      fill: WHITE,
    });
  }

  const gap = 5;
  const boxW = (CONTENT_W - (stats.length - 1) * gap) / stats.length;
  stats.forEach((stat, i) => {
    const x = MARGIN + i * (boxW + gap);
    drawHardRect(doc, x, y, boxW, 26, stat.fill, 2.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(stat.label, x + 4, y + 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(stat.value, x + 4, y + 19);
  });

  return y + 38;
}

function sectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFillColor(...INK);
  doc.rect(MARGIN, y - 1, 6, 10, "F");
  doc.setFillColor(...SLAP);
  doc.rect(MARGIN + 6, y - 1, 4, 10, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(title.toUpperCase(), MARGIN + 14, y + 7);

  return y + 14;
}

function tableDefaults() {
  return {
    theme: "grid" as const,
    margin: { left: MARGIN, right: MARGIN },
    headStyles: {
      fillColor: INK,
      textColor: LIME,
      fontStyle: "bold" as const,
      fontSize: 9,
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: INK,
      fontStyle: "bold" as const,
    },
    alternateRowStyles: {
      fillColor: PAPER,
    },
    styles: {
      lineColor: INK,
      lineWidth: 0.6,
      fontStyle: "bold" as const,
    },
  };
}

function drawInsights(doc: jsPDF, insights: AIInsight[], startY: number): number {
  let y = sectionTitle(doc, "AI Insights", startY);

  if (!insights.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No insights available for this month.", MARGIN, y + 4);
    return y + 12;
  }

  for (const insight of insights) {
    const textWidth = CONTENT_W - 14;
    const title = sanitizePdfText(insight.title);
    const detail = sanitizePdfText(insight.detail);
    const titleLines = doc.splitTextToSize(title, textWidth);
    const detailLines = doc.splitTextToSize(detail, textWidth);
    const blockH = 12 + titleLines.length * 5 + 3 + detailLines.length * 4.5 + 8;

    if (y + blockH > 265) {
      doc.addPage();
      y = MARGIN + 8;
    }

    const fill: [number, number, number] =
      insight.type === "warning"
        ? [255, 245, 244]
        : insight.type === "positive"
          ? [240, 255, 244]
          : [255, 248, 244];

    drawHardRect(doc, MARGIN, y, CONTENT_W, blockH, fill, 2.5);

    const badgeColors: Record<string, [number, number, number]> = {
      warning: NEGATIVE,
      positive: POSITIVE,
      neutral: SLAP,
    };
    const badge = badgeColors[insight.type] ?? SLAP;
    doc.setFillColor(...badge);
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.8);
    doc.rect(MARGIN + 5, y + 5, 32, 7, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...WHITE);
    doc.text(insight.type.toUpperCase(), MARGIN + 21, y + 9.5, { align: "center" });

    let innerY = y + 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    innerY = drawLeftAlignedLines(doc, title, MARGIN + 6, innerY, textWidth, 5);
    innerY += 3;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    drawLeftAlignedLines(doc, detail, MARGIN + 6, innerY, textWidth, 4.5);

    y += blockH + 8;
  }

  return y;
}

export function generateMonthlyPdf(input: {
  summary: MonthlySummary;
  previousSummary: MonthlySummary | null;
  insights: AIInsight[];
  topExpenses: Expense[];
}): Buffer {
  const doc = new jsPDF();
  const { summary, previousSummary, insights, topExpenses } = input;
  const monthLabel = format(parseISO(`${summary.month}-01`), "MMMM yyyy");

  // Paper page background tint
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, PAGE_W, 297, "F");

  let y = drawHeader(doc, monthLabel, summary, previousSummary);

  y = sectionTitle(doc, "Spending by Category", y);

  const categoryRows = summary.byCategory
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((c) => [
      getCategoryLabel(c.category),
      CATEGORIES[normalizeCategory(c.category)].isInvestment ? "Investment" : "Spending",
      formatPdfCurrency(c.total),
      String(c.count),
    ]);

  autoTable(doc, {
    startY: y,
    head: [["Category", "Type", "Amount", "Count"]],
    body: categoryRows,
    ...tableDefaults(),
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: 35 },
      2: { cellWidth: 40, halign: "right" },
      3: { cellWidth: 24, halign: "center" },
    },
  });

  y = (doc as AutoTableDoc).lastAutoTable.finalY + 14;

  if (topExpenses.length) {
    if (y > 240) {
      doc.addPage();
      doc.setFillColor(...PAPER);
      doc.rect(0, 0, PAGE_W, 297, "F");
      y = MARGIN + 8;
    }

    y = sectionTitle(doc, "Top Expenses", y);

    autoTable(doc, {
      startY: y,
      head: [["Description", "Category", "Amount", "Date"]],
      body: topExpenses.slice(0, 10).map((e) => [
        e.description ?? "-",
        getCategoryLabel(e.category),
        formatPdfCurrency(Number(e.amount)),
        e.expense_date,
      ]),
      ...tableDefaults(),
      columnStyles: {
        0: { cellWidth: 62 },
        1: { cellWidth: 42 },
        2: { cellWidth: 36, halign: "right" },
        3: { cellWidth: 28 },
      },
    });

    y = (doc as AutoTableDoc).lastAutoTable.finalY + 14;
  }

  if (y > 220) {
    doc.addPage();
    doc.setFillColor(...PAPER);
    doc.rect(0, 0, PAGE_W, 297, "F");
    y = MARGIN + 8;
  }

  drawInsights(doc, insights, y);

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawPageFooter(doc, p, totalPages);
  }

  return Buffer.from(doc.output("arraybuffer"));
}
