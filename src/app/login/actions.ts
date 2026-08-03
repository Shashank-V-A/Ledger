"use server";

import {
  clearSessionCookie,
  createSessionCookie,
} from "@/lib/auth";
import {
  getUserByLoginId,
  getUserBySetupToken,
  setUserPassword,
  verifyPassword,
} from "@/lib/users";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const loginId = String(formData.get("login_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") || "/");

  if (!loginId || !password) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const user = await getUserByLoginId(loginId);
  if (!user || !user.password_hash || !verifyPassword(password, user.password_hash)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  await createSessionCookie(user.id);
  redirect(next.startsWith("/") ? next : "/");
}

export async function setupPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) redirect("/login?error=setup");
  if (password.length < 6) {
    redirect(`/setup?token=${encodeURIComponent(token)}&error=short`);
  }
  if (password !== confirm) {
    redirect(`/setup?token=${encodeURIComponent(token)}&error=match`);
  }

  const user = await getUserBySetupToken(token);
  if (!user) {
    redirect("/login?error=setup");
  }

  await setUserPassword(user.id, password);
  await createSessionCookie(user.id);
  redirect("/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
