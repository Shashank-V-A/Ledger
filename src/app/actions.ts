"use server";

import { revalidatePath } from "next/cache";
import type { CategoryId } from "@/lib/categories";
import { requireUser } from "@/lib/auth";
import {
  createExpense,
  deleteExpense,
  updateExpense,
  upsertBudget,
} from "@/lib/expenses";

export async function addExpenseAction(formData: FormData) {
  const user = await requireUser();
  const amount = Number(formData.get("amount"));
  const category = formData.get("category") as CategoryId;
  const description = String(formData.get("description") || "");
  const expense_date = String(formData.get("expense_date") || "");

  if (!amount || amount <= 0) throw new Error("Invalid amount");

  await createExpense({
    amount,
    category,
    description,
    expense_date: expense_date || undefined,
    source: "web",
    userId: user.id,
  });

  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/categories");
}

export async function updateExpenseAction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount"));
  const category = formData.get("category") as CategoryId;
  const description = String(formData.get("description") || "");
  const expense_date = String(formData.get("expense_date"));

  if (!id || !amount || amount <= 0) throw new Error("Invalid expense");

  await updateExpense(
    id,
    { amount, category, description, expense_date },
    user.id
  );
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/categories");
}

export async function deleteExpenseAction(id: string) {
  const user = await requireUser();
  await deleteExpense(id, user.id);
  revalidatePath("/");
  revalidatePath("/expenses");
  revalidatePath("/categories");
}

export async function saveBudgetAction(formData: FormData) {
  const user = await requireUser();
  const category = formData.get("category") as CategoryId;
  const monthly_limit = Number(formData.get("monthly_limit"));

  if (!monthly_limit || monthly_limit <= 0) throw new Error("Invalid budget");

  await upsertBudget(category, monthly_limit, user.id);
  revalidatePath("/");
  revalidatePath("/budgets");
}
