import { Sidebar } from "@/components/Sidebar";
import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Ledger — Personal Expenses",
  description: "Track spending, investments, and insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} h-full`}
    >
      <body className="relative min-h-full">
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden pb-20 lg:pb-0">
            <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10 lg:py-12">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
