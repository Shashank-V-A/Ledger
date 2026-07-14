"use server";

import { AUTH_COOKIE, getAuthToken, passwordMatches } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") || "/");

  if (!passwordMatches(password)) {
    redirect(`/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const token = getAuthToken();
  if (token) {
    const jar = await cookies();
    jar.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect("/login");
}
