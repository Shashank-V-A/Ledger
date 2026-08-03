import { setupPasswordAction } from "@/app/login/actions";
import { getUserBySetupToken } from "@/lib/users";
import { redirect } from "next/navigation";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  if (!token) redirect("/login?error=setup");

  const user = await getUserBySetupToken(token);
  if (!user) redirect("/login?error=setup");

  const error =
    params.error === "short"
      ? "Password must be at least 6 characters"
      : params.error === "match"
        ? "Passwords do not match"
        : null;

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center border-[3px] border-[var(--ink)] bg-[var(--ink)] font-[family-name:var(--font-syne)] text-2xl font-extrabold text-[var(--lime)] shadow-[4px_4px_0_var(--ink)]">
            L
          </div>
          <h1 className="font-[family-name:var(--font-syne)] text-3xl font-extrabold uppercase tracking-tight text-[var(--text)]">
            Set password
          </h1>
          <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">
            Ledger for {user.display_name || user.login_id}
            <br />
            Login ID: <strong>{user.login_id}</strong>
          </p>
        </div>

        <form action={setupPasswordAction} className="panel p-6">
          <input type="hidden" name="token" value={token} />
          <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[var(--text)]">
            New password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoFocus
            autoComplete="new-password"
            className="field mb-3"
            placeholder="Min 6 characters"
          />
          <label className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[var(--text)]">
            Confirm password
          </label>
          <input
            name="confirm"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="field"
            placeholder="Repeat password"
          />
          {error && (
            <p className="mt-2 text-sm font-bold text-[var(--negative)]">{error}</p>
          )}
          <button type="submit" className="btn-primary mt-4 w-full">
            Save & open dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
