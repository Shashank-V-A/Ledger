"use client";

import { logoutAction } from "@/app/login/actions";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview", icon: "◈" },
  { href: "/categories", label: "Categories", icon: "◎" },
  { href: "/expenses", label: "Expenses", icon: "≡" },
];

export function Sidebar({ showLogout = false }: { showLogout?: boolean }) {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <>
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r-[3px] border-[var(--ink)] bg-[var(--sidebar)]">
        <div className="px-5 py-7 border-b-[3px] border-[var(--lime)]/30">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-[3px] border-[var(--lime)] bg-[var(--lime)] font-[family-name:var(--font-syne)] text-base font-extrabold text-[var(--ink)] shadow-[3px_3px_0_var(--lime)]">
              L
            </div>
            <div>
              <p className="font-[family-name:var(--font-syne)] text-[16px] font-extrabold tracking-tight text-[var(--lime)] uppercase">
                Ledger
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-on-teal-muted)]">
                Expense log
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
          {links.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 border-[3px] px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-all ${
                  active
                    ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--ink)] shadow-[3px_3px_0_#c8f04d88]"
                    : "border-transparent text-[var(--text-on-teal-muted)] hover:border-[var(--lime)]/40 hover:text-[var(--lime)]"
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t-[3px] border-[var(--lime)]/25 px-5 py-5">
          <p className="text-[11px] leading-relaxed font-medium text-[var(--text-on-teal-muted)]">
            Log via Telegram
            <br />
            <span className="font-bold text-[var(--lime)]">@Expense_va_automationBot</span>
          </p>
          {showLogout && (
            <form action={logoutAction} className="mt-3">
              <button
                type="submit"
                className="text-[11px] font-bold uppercase tracking-wide text-[var(--slap)] underline-offset-2 hover:underline"
              >
                Lock dashboard
              </button>
            </form>
          )}
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t-[3px] border-[var(--ink)] bg-[var(--ink)] lg:hidden">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 border-r-[3px] border-[var(--ink)] py-3 text-[10px] font-bold uppercase tracking-wide last:border-r-0 ${
                active
                  ? "bg-[var(--lime)] text-[var(--ink)]"
                  : "text-[var(--lime)]/55"
              }`}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
