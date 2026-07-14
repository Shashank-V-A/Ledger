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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--teal)] font-[family-name:var(--font-bricolage)] text-lg font-bold text-white">
            L
          </div>
          <h1 className="font-[family-name:var(--font-bricolage)] text-2xl font-semibold text-[var(--text)]">
            Ledger
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Enter password to continue
          </p>
        </div>

        <form action={loginAction} className="panel p-6">
          <input type="hidden" name="next" value={next} />
          <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
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
            <p className="mt-2 text-sm text-[var(--negative)]">
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
