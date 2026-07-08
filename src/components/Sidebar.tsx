"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Overview", icon: "◈" },
  { href: "/expenses", label: "Expenses", icon: "≡" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-[var(--border-strong)] bg-[var(--bg-elevated)]">
        <div className="px-6 py-8">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-bold text-[#0e1117]">
              L
            </div>
            <div>
              <p className="font-[family-name:var(--font-bricolage)] text-[15px] font-semibold tracking-tight text-[var(--text)]">
                Ledger
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">Expense tracker</p>
            </div>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {links.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--text)] font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
                }`}
              >
                <span className={`text-base ${active ? "text-[var(--accent)]" : "opacity-60"}`}>
                  {icon}
                </span>
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] px-6 py-5">
          <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
            Log via Telegram
            <br />
            <span className="text-[var(--text-secondary)]">@Expense_va_automationBot</span>
          </p>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--border-strong)] bg-[var(--bg-elevated)]/95 backdrop-blur-md lg:hidden">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${
                active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
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
