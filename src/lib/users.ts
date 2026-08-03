import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

export interface LedgerUser {
  id: string;
  telegram_user_id: number;
  login_id: string;
  display_name: string | null;
  telegram_username: string | null;
  password_hash: string | null;
  setup_token: string | null;
  created_at: string;
  updated_at: string;
}

function normalizeLoginId(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@/, "");
}

function makeLoginId(telegramUserId: number, username?: string | null): string {
  if (username?.trim()) {
    return normalizeLoginId(username);
  }
  return `user${telegramUserId}`;
}

function newSetupToken(): string {
  return randomBytes(24).toString("hex");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const next = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (next.length !== expected.length) return false;
  return timingSafeEqual(next, expected);
}

export async function getUserByTelegramId(
  telegramUserId: number
): Promise<LedgerUser | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  if (error) throw error;
  return (data as LedgerUser | null) ?? null;
}

export async function getUserByLoginId(loginId: string): Promise<LedgerUser | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("login_id", normalizeLoginId(loginId))
    .maybeSingle();
  if (error) throw error;
  return (data as LedgerUser | null) ?? null;
}

export async function getUserById(id: string): Promise<LedgerUser | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as LedgerUser | null) ?? null;
}

export async function getUserBySetupToken(
  token: string
): Promise<LedgerUser | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("setup_token", token)
    .maybeSingle();
  if (error) throw error;
  return (data as LedgerUser | null) ?? null;
}

export async function listUsersWithTelegram(): Promise<LedgerUser[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .not("telegram_user_id", "is", null);
  if (error) throw error;
  return (data ?? []) as LedgerUser[];
}

/** Create or update a ledger user when they message the bot. */
export async function upsertUserFromTelegram(input: {
  telegramUserId: number;
  firstName?: string;
  username?: string | null;
}): Promise<{ user: LedgerUser; created: boolean }> {
  const existing = await getUserByTelegramId(input.telegramUserId);
  const supabase = createServiceClient();

  if (existing) {
    const loginId =
      input.username?.trim() && !existing.password_hash
        ? makeLoginId(input.telegramUserId, input.username)
        : existing.login_id;

    const { data, error } = await supabase
      .from("users")
      .update({
        display_name: input.firstName ?? existing.display_name,
        telegram_username: input.username ?? existing.telegram_username,
        login_id: loginId,
        setup_token: existing.password_hash
          ? existing.setup_token
          : existing.setup_token ?? newSetupToken(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return { user: data as LedgerUser, created: false };
  }

  const loginId = makeLoginId(input.telegramUserId, input.username);
  // Ensure login_id uniqueness if username already taken
  let finalLoginId = loginId;
  const clash = await getUserByLoginId(finalLoginId);
  if (clash) {
    finalLoginId = `user${input.telegramUserId}`;
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      telegram_user_id: input.telegramUserId,
      login_id: finalLoginId,
      display_name: input.firstName ?? null,
      telegram_username: input.username ?? null,
      setup_token: newSetupToken(),
    })
    .select()
    .single();

  if (error) throw error;
  return { user: data as LedgerUser, created: true };
}

export async function setUserPassword(
  userId: string,
  password: string
): Promise<LedgerUser> {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("users")
    .update({
      password_hash: hashPassword(password),
      setup_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as LedgerUser;
}

export async function refreshSetupToken(userId: string): Promise<string> {
  const token = newSetupToken();
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("users")
    .update({ setup_token: token, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
  return token;
}

export function getAppUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Simple signed session helper shared with middleware via env SESSION_SECRET */
export function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.DASHBOARD_PASSWORD?.trim() ||
    "ledger-dev-session-secret"
  );
}

export function createSessionToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const payload = `${userId}.${exp}`;
  const sig = createHash("sha256")
    .update(`${payload}.${getSessionSecret()}`)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function parseSessionToken(
  token: string | undefined | null
): { userId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!userId || !exp || Number.isNaN(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  const expected = createHash("sha256")
    .update(`${userId}.${exp}.${getSessionSecret()}`)
    .digest("hex");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { userId };
}
