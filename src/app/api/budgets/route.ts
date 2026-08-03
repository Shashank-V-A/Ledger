import { getBudgets, upsertBudget } from "@/lib/expenses";
import { isValidCategory } from "@/lib/categories";
import type { CategoryId } from "@/lib/categories";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-ledger-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const budgets = await getBudgets(userId);
  return NextResponse.json(budgets);
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-ledger-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!isValidCategory(body.category) || !body.monthly_limit) {
    return NextResponse.json({ error: "Invalid budget data" }, { status: 400 });
  }

  const budget = await upsertBudget(
    body.category as CategoryId,
    Number(body.monthly_limit),
    userId
  );
  return NextResponse.json(budget);
}
