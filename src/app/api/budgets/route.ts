import { getBudgets, upsertBudget } from "@/lib/expenses";
import { isValidCategory } from "@/lib/categories";
import type { CategoryId } from "@/lib/categories";
import { NextRequest, NextResponse } from "next/server";

function isAuthorized(request: NextRequest): boolean {
  const apiKey = process.env.DASHBOARD_API_KEY;
  if (!apiKey) return true;
  return request.headers.get("x-api-key") === apiKey;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const budgets = await getBudgets();
  return NextResponse.json(budgets);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!isValidCategory(body.category) || !body.monthly_limit) {
    return NextResponse.json({ error: "Invalid budget data" }, { status: 400 });
  }

  const budget = await upsertBudget(
    body.category as CategoryId,
    Number(body.monthly_limit)
  );
  return NextResponse.json(budget);
}
