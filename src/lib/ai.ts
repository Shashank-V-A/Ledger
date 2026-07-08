import {
  CATEGORIES,
  type CategoryId,
  getCategoryLabel,
} from "@/lib/categories";
import type { ParsedExpense } from "@/types";
import OpenAI from "openai";

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;

function guessCategoryFromKeywords(text: string): {
  category: CategoryId;
  matched: boolean;
} {
  const lower = text.toLowerCase();

  // Prefer longer keyword matches (e.g. "outside home" before "outside")
  const matches: { id: CategoryId; length: number }[] = [];
  for (const [id, cat] of Object.entries(CATEGORIES)) {
    for (const kw of cat.keywords) {
      if (lower.includes(kw)) {
        matches.push({ id: id as CategoryId, length: kw.length });
      }
    }
  }

  if (matches.length) {
    matches.sort((a, b) => b.length - a.length);
    return { category: matches[0].id, matched: true };
  }

  return { category: "miscellaneous", matched: false };
}

function cleanDescription(text: string, amount: number): string {
  return (
    text
      .replace(/(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{1,2})?/gi, "")
      .replace(/[\d,]+(?:\.\d{1,2})?\s*(?:rs\.?|inr|₹)/gi, "")
      .replace(new RegExp(`\\b${amount}\\s*/-`, "g"), "")
      .replace(/\b[\d,]+(?:\.\d{1,2})?\s*\/-\b/g, "")
      .replace(/\b[\d,]+(?:\.\d{1,2})?\b/g, "")
      .replace(/^[\s\-/]+|[\s\-/]+$/g, "")
      .trim() || "Expense"
  );
}

function parseAmount(text: string): number | null {
  const patterns = [
    /(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:rs\.?|inr|₹)/i,
    /\b([\d,]+(?:\.\d{1,2})?)\s*\/-\b/,
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

function ruleBasedParse(
  text: string
): (ParsedExpense & { matched: boolean }) | null {
  const amount = parseAmount(text);
  if (!amount) return null;

  const { category, matched } = guessCategoryFromKeywords(text);
  const description = cleanDescription(text, amount);

  return { amount, category, description, matched };
}

export async function parseExpenseText(text: string): Promise<ParsedExpense> {
  const ruleResult = ruleBasedParse(text);

  // Trust rule-based parsing when keywords matched (including explicit miscellaneous)
  if (ruleResult?.matched) {
    const { matched: _, ...parsed } = ruleResult;
    return parsed;
  }

  if (!groq) {
    if (ruleResult) {
      const { matched: _, ...parsed } = ruleResult;
      return parsed;
    }
    throw new Error("Could not parse expense. Set GROQ_API_KEY for smarter parsing.");
  }

  const categoryList = Object.entries(CATEGORIES)
    .map(([id, c]) => `- ${id}: ${c.label}`)
    .join("\n");

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You parse Indian expense messages into JSON. Categories:\n${categoryList}\n\nReturn: {"amount": number, "category": "category_id", "description": "short label"}. Amount in INR.\n\nRules:\n- food_small: tea, coffee, snacks\n- food_dining_out: restaurants, eating outside home\n- food_ordering_in: zomato, swiggy, delivery\n- entertainment: leisure only — movies, games, concerts, streaming (netflix/spotify)\n- miscellaneous: hackathons, registrations, workshops, courses, exam fees, one-off fees, gifts, repairs, and anything that does not clearly fit another category`,
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
    parsed.category = guessCategoryFromKeywords(text).category;
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
  if (!groq) {
    return buildFallbackInsights(input);
  }

  const response = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Generate 3-5 personalized spending insights for an Indian user. Return JSON: {"insights":[{"title":"...","detail":"...","type":"warning|positive|neutral"}]}. Be specific with numbers and categories. Compare to previous month if available. Investments are included in total expenditure. Use "Rs." for amounts (never the rupee symbol). No generic advice.',
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
      title: diff > 0 ? "Expenditure increased" : "Expenditure decreased",
      detail: `Total expenditure is ${pct > 0 ? "+" : ""}${pct}% vs last month.`,
      type: diff > 0 ? "warning" : "positive",
    });
  }

  const top = [...input.current.byCategory]
    .sort((a, b) => b.total - a.total)[0];

  if (top) {
    insights.push({
      title: "Top category",
      detail: `${getCategoryLabel(top.category)} accounted for the largest share at ₹${Math.round(top.total).toLocaleString("en-IN")}.`,
      type: "neutral",
    });
  }

  return insights.slice(0, 5);
}
