import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  getUserById,
  parseSessionToken,
  type LedgerUser,
} from "@/lib/users";

export const AUTH_COOKIE = "ledger_session";

export function isAuthEnabled(): boolean {
  // Multi-user: dashboard always requires a signed-in user
  return true;
}

export async function createSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(AUTH_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  return parseSessionToken(token)?.userId ?? null;
}

export async function getCurrentUser(): Promise<LedgerUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  return getUserById(userId);
}

export async function requireUser(): Promise<LedgerUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
