import { loginAction } from "@/app/login/actions";
import { isAuthEnabled } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  if (!isAuthEnabled()) {
    redirect("/");
  }

  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/";
  const hasError = params.error === "1";

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
          <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Enter password to continue
          </p>
        </div>

        <form action={loginAction} className="panel p-6">
          <input type="hidden" name="next" value={next} />
          <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[var(--text)]">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            className="field"
            placeholder="••••••••"
          />
          {hasError && (
            <p className="mt-2 text-sm font-bold text-[var(--negative)]">
              Incorrect password
            </p>
          )}
          <button type="submit" className="btn-primary mt-4 w-full">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
