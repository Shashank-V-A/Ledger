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
      <aside className="hidden lg:flex w-56 shrink-0 flex-col bg-[var(--sidebar)] shadow-lg">
        <div className="px-6 py-8">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--mint)] text-sm font-bold text-[var(--teal)]">
              L
            </div>
            <div>
              <p className="font-[family-name:var(--font-bricolage)] text-[15px] font-semibold tracking-tight text-[var(--text-on-teal)]">
                Ledger
              </p>
              <p className="text-[11px] text-[var(--text-on-teal-muted)]">Expense tracker</p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                  active
                    ? "bg-[var(--mint)] text-[var(--teal-dark)] font-semibold shadow-sm"
                    : "text-[var(--text-on-teal-muted)] hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className={`text-base ${active ? "text-[var(--teal)]" : ""}`}>
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/15 px-6 py-5">
          <p className="text-[11px] leading-relaxed text-[var(--text-on-teal-muted)]">
            Log via Telegram
            <br />
            <span className="text-[var(--mint)]">@Expense_va_automationBot</span>
          </p>
          {showLogout && (
            <form action={logoutAction} className="mt-3">
              <button
                type="submit"
                className="text-[11px] font-medium text-[var(--mint)]/80 underline-offset-2 hover:text-white hover:underline"
              >
                Lock dashboard
              </button>
            </form>
          )}
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--border-strong)] bg-[var(--teal)] lg:hidden">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                active ? "text-[var(--mint)]" : "text-white/60"
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
