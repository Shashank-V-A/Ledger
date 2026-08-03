import { loginAction } from "@/app/login/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/";
  const hasError = params.error === "1";
  const setupError = params.error === "setup";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[3px] border-[var(--ink)] bg-[var(--ink)] font-[family-name:var(--font-syne)] text-2xl font-extrabold text-[var(--lime)] shadow-[4px_4px_0_var(--ink)]">
            L
          </div>
          <h1 className="font-[family-name:var(--font-syne)] text-3xl font-extrabold uppercase tracking-tight text-[var(--text)]">
            Ledger
          </h1>
          <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">
            Open your personal ledger
          </p>
        </div>

        <form action={loginAction} className="panel p-6">
          <input type="hidden" name="next" value={next} />
          <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[var(--text)]">
            Login ID
          </label>
          <input
            name="login_id"
            type="text"
            required
            autoFocus
            autoComplete="username"
            className="field mb-3"
            placeholder="from Telegram /start"
          />
          <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[var(--text)]">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="field"
            placeholder="••••••••"
          />
          {hasError && (
            <p className="mt-2 text-sm font-bold text-[var(--negative)]">
              Invalid login ID or password
            </p>
          )}
          {setupError && (
            <p className="mt-2 text-sm font-bold text-[var(--negative)]">
              That setup link is invalid. Send /start on Telegram for a new one.
            </p>
          )}
          <button type="submit" className="btn-primary mt-4 w-full">
            Unlock
          </button>
          <p className="mt-4 text-center text-xs font-semibold text-[var(--text-muted)]">
            New here? Message the Telegram bot with <strong>/start</strong>, then
            open the password setup link it sends you.
          </p>
        </form>
      </div>
    </div>
  );
}
