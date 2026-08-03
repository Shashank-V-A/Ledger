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

export function cleanDescription(text: string, amount: number): string {
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

export function parseAmount(text: string): number | null {
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

/** Parse amount + optional description without assigning a category. */
export function parseAmountAndDescription(
  text: string
): { amount: number; description: string } | null {
  const amount = parseAmount(text);
  if (!amount) return null;
  return { amount, description: cleanDescription(text, amount) };
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
        content: `You parse Indian expense messages into JSON. Categories:\n${categoryList}\n\nReturn: {"amount": number, "category": "category_id", "description": "short label"}. Amount in INR.\n\nRules:\n- food_small: tea, coffee, snacks\n- food_dining_out: restaurants, eating outside home\n- food_ordering_in: zomato, swiggy, delivery\n- entertainment: movies, games, concerts, streaming/subscriptions (netflix/spotify/prime), and recurring mobile/phone recharge (jio, airtel, prepaid, postpaid)\n- gym_fitness: gym membership, fitness, workout, yoga, protein, trainers\n- miscellaneous: hackathons, registrations, workshops, courses, exam fees, one-off fees, gifts, repairs, and anything that does not clearly fit another category`,
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
          'You are a practical money coach for an Indian user, not a reporting tool. Return JSON: {"insights":[{"title":"...","detail":"...","type":"warning|positive|neutral"}]}. Generate 3-5 insights that help the user improve money management. Each insight must do at least one of these: identify a risky pattern, point out a healthy habit worth continuing, recommend a concrete next action, or suggest where to cut back with reasoning. Use specific numbers and categories from the input. Compare to the previous month when useful. If budgets are present, explicitly mention overruns or remaining headroom. Avoid bland summaries like "X was your top category" unless you immediately explain why it matters and what to do next. Keep each detail to 1-3 sentences. Use "Rs." for amounts (never the rupee symbol). Treat investments separately from spending and mention that distinction when relevant.',
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
    totalInvested: number;
    byCategory: { category: CategoryId; total: number }[];
  };
  previous: { totalSpent: number; byCategory: { category: CategoryId; total: number }[] } | null;
  budgets: { category: CategoryId; monthly_limit: number }[];
  topExpenses?: { description: string; amount: number; category: CategoryId }[];
}): { title: string; detail: string; type: "warning" | "positive" | "neutral" }[] {
  const insights: { title: string; detail: string; type: "warning" | "positive" | "neutral" }[] = [];

  const totalSpent = input.current.totalSpent;
  const sortedCats = [...input.current.byCategory].sort((a, b) => b.total - a.total);
  const top = sortedCats[0];
  const budgetMap = new Map(input.budgets.map((b) => [b.category, b.monthly_limit]));

  if (input.previous) {
    const diff = totalSpent - input.previous.totalSpent;
    const pct = input.previous.totalSpent
      ? Math.round((diff / input.previous.totalSpent) * 100)
      : 0;

    if (Math.abs(diff) >= 300) {
      insights.push({
        title: diff > 0 ? "Spending creep needs attention" : "You pulled spending back",
        detail:
          diff > 0
            ? `Your spending is ${pct > 0 ? "+" : ""}${pct}% vs last month. If this pace continues, focus first on the categories that changed most rather than trying to cut everything at once.`
            : `Your spending is ${pct}% vs last month, which suggests better control. Try to keep next month at or below this run rate before increasing discretionary spending again.`,
        type: diff > 0 ? "warning" : "positive",
      });
    }
  }

  if (top) {
    const share = totalSpent ? Math.round((top.total / totalSpent) * 100) : 0;
    if (share >= 35) {
      insights.push({
        title: "One category is dominating your month",
        detail: `${getCategoryLabel(top.category)} is taking ${share}% of spending at Rs. ${Math.round(top.total).toLocaleString("en-IN")}. That concentration makes this the highest-leverage place to change behavior, so even a 10-15% cut here will matter more than tiny cuts elsewhere.`,
        type: "warning",
      });
    } else {
      insights.push({
        title: "Your spending is reasonably diversified",
        detail: `${getCategoryLabel(top.category)} is your biggest bucket, but it is only ${share}% of spending. That usually means you do not have a single runaway category, so small habit tweaks across 1-2 discretionary areas should be enough.`,
        type: "positive",
      });
    }
  }

  const foodCats = sortedCats.filter((c) =>
    c.category === "food_dining_out" ||
    c.category === "food_ordering_in" ||
    c.category === "food_small"
  );
  const foodTotal = foodCats.reduce((sum, c) => sum + c.total, 0);
  const diningOut = foodCats.find((c) => c.category === "food_dining_out")?.total ?? 0;
  const orderingIn = foodCats.find((c) => c.category === "food_ordering_in")?.total ?? 0;
  if (totalSpent > 0 && foodTotal / totalSpent >= 0.3) {
    insights.push({
      title: "Food is the easiest place to recover cash",
      detail: `Food spending is Rs. ${Math.round(foodTotal).toLocaleString("en-IN")}, which is ${Math.round((foodTotal / totalSpent) * 100)}% of your monthly spend. Start with dining out and ordering in first${diningOut + orderingIn > 0 ? `, because those alone are Rs. ${Math.round(diningOut + orderingIn).toLocaleString("en-IN")}` : ""}, and set yourself a simple weekly cap.`,
      type: "warning",
    });
  }

  for (const currentCat of sortedCats) {
    const limit = budgetMap.get(currentCat.category);
    if (!limit || limit <= 0) continue;
    const usedPct = Math.round((currentCat.total / limit) * 100);
    if (currentCat.total > limit) {
      insights.push({
        title: `${getCategoryLabel(currentCat.category)} crossed its limit`,
        detail: `You spent Rs. ${Math.round(currentCat.total).toLocaleString("en-IN")} against a budget of Rs. ${Math.round(limit).toLocaleString("en-IN")}. Next month, give this category a weekly cap or reduce one repeat expense early in the month so the overrun does not snowball.`,
        type: "warning",
      });
      break;
    }
    if (usedPct >= 70 && usedPct <= 100) {
      insights.push({
        title: `${getCategoryLabel(currentCat.category)} is close to budget`,
        detail: `You have already used ${usedPct}% of that category budget. Keep this on watch now, because one or two more impulse spends could push it over the line.`,
        type: "neutral",
      });
      break;
    }
  }

  if (input.current.totalInvested > 0) {
    const investVsSpend = totalSpent > 0
      ? Math.round((input.current.totalInvested / totalSpent) * 100)
      : 100;
    insights.push({
      title: "Investing habit is a strong anchor",
      detail: `You invested Rs. ${Math.round(input.current.totalInvested).toLocaleString("en-IN")} this month, about ${investVsSpend}% of what you spent. Protect this first before optimizing smaller discretionary categories, because consistent investing matters more than perfect category control.`,
      type: "positive",
    });
  }

  const largestExpense = input.topExpenses?.[0];
  if (largestExpense && largestExpense.amount >= 1000) {
    insights.push({
      title: "Review your largest discretionary purchases",
      detail: `Your biggest expense was ${largestExpense.description} at Rs. ${Math.round(largestExpense.amount).toLocaleString("en-IN")} under ${getCategoryLabel(largestExpense.category)}. Large one-off spends are worth a quick review because they often reveal avoidable subscriptions, impulse upgrades, or better-timed alternatives.`,
      type: "neutral",
    });
  }

  return insights.slice(0, 5);
}
