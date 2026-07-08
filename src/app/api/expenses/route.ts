import {
  createExpense,
  deleteExpense,
  getExpenses,
  updateExpense,
} from "@/lib/expenses";
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

  const month = request.nextUrl.searchParams.get("month") ?? undefined;
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const limit = request.nextUrl.searchParams.get("limit");

  const expenses = await getExpenses({
    month,
    category: category as CategoryId | undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });

  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.amount || !body.category || !isValidCategory(body.category)) {
    return NextResponse.json({ error: "Invalid expense data" }, { status: 400 });
  }

  const expense = await createExpense({
    amount: Number(body.amount),
    category: body.category,
    description: body.description,
    expense_date: body.expense_date,
    source: "web",
  });

  return NextResponse.json(expense, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const expense = await updateExpense(body.id, {
    amount: body.amount,
    category: body.category,
    description: body.description,
    expense_date: body.expense_date,
  });

  return NextResponse.json(expense);
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteExpense(id);
  return NextResponse.json({ ok: true });
}
