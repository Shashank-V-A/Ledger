import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "ledger_auth";

const PUBLIC_PREFIXES = [
  "/login",
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

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const password = process.env.DASHBOARD_PASSWORD?.trim();

  if (!password || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const expected = await sha256Hex(`ledger:${password}`);
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const authed = token === expected;

  if (pathname.startsWith("/api/")) {
    if (!authed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!authed) {
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
