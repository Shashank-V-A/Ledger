import {
  CATEGORIES,
  type CategoryId,
  getCategoryLabel,
} from "@/lib/categories";
import type { ParsedExpense } from "@/types";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function guessCategoryFromKeywords(text: string): CategoryId {
  const lower = text.toLowerCase();
  for (const [id, cat] of Object.entries(CATEGORIES)) {
    if (cat.keywords.some((kw) => lower.includes(kw))) {
      return id as CategoryId;
    }
  }
  return "miscellaneous";
}

function parseAmount(text: string): number | null {
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i,
    /\b([\d,]+(?:\.\d{1,2})?)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ""));
      if (!Number.isNaN(value) && value > 0) return value;
    }
  }
  return null;
}

function ruleBasedParse(text: string): ParsedExpense | null {
  const amount = parseAmount(text);
  if (!amount) return null;

  const category = guessCategoryFromKeywords(text);
  const description = text
    .replace(/(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?/gi, "")
    .replace(/[\d,]+(?:\.\d{1,2})?\s*(?:rs\.?|inr|₹)/gi, "")
    .replace(/\b[\d,]+(?:\.\d{1,2})?\b/g, "")
    .trim() || "Expense";

  return { amount, category, description };
}

export async function parseExpenseText(text: string): Promise<ParsedExpense> {
  const ruleResult = ruleBasedParse(text);
  if (ruleResult && ruleResult.description.length > 2) {
    return ruleResult;
  }

  if (!openai) {
    if (ruleResult) return ruleResult;
    throw new Error("Could not parse expense. Set OPENAI_API_KEY for smarter parsing.");
  }

  const categoryList = Object.entries(CATEGORIES)
    .map(([id, c]) => `- ${id}: ${c.label}`)
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You parse Indian expense messages into JSON. Categories:\n${categoryList}\n\nReturn: {"amount": number, "category": "category_id", "description": "short label"}. Amount in INR. Use food_small for tea/coffee/snacks, food_ordering for restaurant/delivery.`,
      },
      { role: "user", content: text },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("AI parsing failed");

  const parsed = JSON.parse(content) as ParsedExpense;
  if (!parsed.amount || parsed.amount <= 0) {
    throw new Error("Could not detect a valid amount");
  }
  if (!(parsed.category in CATEGORIES)) {
    parsed.category = guessCategoryFromKeywords(text);
  }
  return parsed;
}

export async function generateInsights(input: {
  current: {
    month: string;
    totalSpent: number;
    totalInvested: number;
    byCategory: { category: CategoryId; total: number }[];
  };
  previous: {
    totalSpent: number;
    byCategory: { category: CategoryId; total: number }[];
  } | null;
  budgets: { category: CategoryId; monthly_limit: number }[];
  topExpenses: { description: string; amount: number; category: CategoryId }[];
}): Promise<{ title: string; detail: string; type: "warning" | "positive" | "neutral" }[]> {
  if (!openai) {
    return buildFallbackInsights(input);
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Generate 3-5 personalized spending insights for an Indian user. Return JSON: {"insights":[{"title":"...","detail":"...","type":"warning|positive|neutral"}]}. Be specific with numbers and categories. Compare to previous month if available. Mention budget overruns. No generic advice.',
      },
      { role: "user", content: JSON.stringify(input) },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return buildFallbackInsights(input);

  try {
    const result = JSON.parse(content) as {
      insights: { title: string; detail: string; type: "warning" | "positive" | "neutral" }[];
    };
    return result.insights.slice(0, 5);
  } catch {
    return buildFallbackInsights(input);
  }
}

function buildFallbackInsights(input: {
  current: {
    totalSpent: number;
    byCategory: { category: CategoryId; total: number }[];
  };
  previous: { totalSpent: number } | null;
  budgets: { category: CategoryId; monthly_limit: number }[];
}): { title: string; detail: string; type: "warning" | "positive" | "neutral" }[] {
  const insights: { title: string; detail: string; type: "warning" | "positive" | "neutral" }[] = [];

  if (input.previous) {
    const diff = input.current.totalSpent - input.previous.totalSpent;
    const pct = input.previous.totalSpent
      ? Math.round((diff / input.previous.totalSpent) * 100)
      : 0;
    insights.push({
      title: diff > 0 ? "Spending increased" : "Spending decreased",
      detail: `Total spending is ${pct > 0 ? "+" : ""}${pct}% vs last month.`,
      type: diff > 0 ? "warning" : "positive",
    });
  }

  const top = [...input.current.byCategory]
    .filter((c) => c.category !== "investments")
    .sort((a, b) => b.total - a.total)[0];

  if (top) {
    insights.push({
      title: "Top category",
      detail: `${getCategoryLabel(top.category)} accounted for the most spending.`,
      type: "neutral",
    });
  }

  for (const budget of input.budgets) {
    const spent = input.current.byCategory.find((c) => c.category === budget.category)?.total ?? 0;
    if (spent > budget.monthly_limit) {
      insights.push({
        title: "Budget exceeded",
        detail: `${getCategoryLabel(budget.category)} is over budget by ₹${Math.round(spent - budget.monthly_limit)}.`,
        type: "warning",
      });
    }
  }

  return insights.slice(0, 5);
}
