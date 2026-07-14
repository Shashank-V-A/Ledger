import { createHash, timingSafeEqual } from "crypto";

export const AUTH_COOKIE = "ledger_auth";

export function isAuthEnabled(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD?.trim());
}

export function getAuthToken(): string | null {
  const password = process.env.DASHBOARD_PASSWORD?.trim();
  if (!password) return null;
  return createHash("sha256").update(`ledger:${password}`).digest("hex");
}

export function verifyAuthToken(token: string | undefined | null): boolean {
  const expected = getAuthToken();
  if (!expected) return true;
  if (!token) return false;
  try {
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function passwordMatches(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD?.trim();
  if (!expected) return true;
  return password === expected;
}
