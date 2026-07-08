"use server";

import { revalidatePath } from "next/cache";
import type { CategoryId } from "@/lib/categories";
import {
  createExpense,
  deleteExpense,
  updateExpense,
  upsertBudget,
} from "@/lib/expenses";

export async function addExpenseAction(formData: FormData) {
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
  });

  revalidatePath("/");
  revalidatePath("/expenses");
}

export async function updateExpenseAction(formData: FormData) {
  const id = String(formData.get("id"));
  const amount = Number(formData.get("amount"));
  const category = formData.get("category") as CategoryId;
  const description = String(formData.get("description") || "");
  const expense_date = String(formData.get("expense_date"));

  await updateExpense(id, { amount, category, description, expense_date });
  revalidatePath("/");
  revalidatePath("/expenses");
}

export async function deleteExpenseAction(id: string) {
  await deleteExpense(id);
  revalidatePath("/");
  revalidatePath("/expenses");
}

export async function saveBudgetAction(formData: FormData) {
  const category = formData.get("category") as CategoryId;
  const monthly_limit = Number(formData.get("monthly_limit"));

  if (!monthly_limit || monthly_limit <= 0) throw new Error("Invalid budget");

  await upsertBudget(category, monthly_limit);
  revalidatePath("/");
  revalidatePath("/budgets");
}
