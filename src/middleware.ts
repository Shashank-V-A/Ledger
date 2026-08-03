import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "ledger_session";

const PUBLIC_PREFIXES = [
  "/login",
  "/setup",
  "/api/telegram",
  "/api/cron",
];

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.DASHBOARD_PASSWORD?.trim() ||
    "ledger-dev-session-secret"
  );
}

async function parseSessionToken(
  token: string | undefined
): Promise<{ userId: string } | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!userId || !exp || Number.isNaN(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  const expected = await sha256Hex(`${userId}.${exp}.${getSessionSecret()}`);
  if (expected !== sig) return null;
  return { userId };
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const session = await parseSessionToken(token);

  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-ledger-user-id", session.userId);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
