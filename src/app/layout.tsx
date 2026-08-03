import { Sidebar } from "@/components/Sidebar";
import type { Metadata } from "next";
import { Space_Grotesk, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const space = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${syne.variable} ${space.variable} h-full`}
    >
      <body className="relative min-h-full">
        <div className="relative z-10 flex min-h-screen">
          <Sidebar showLogout />
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
