import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prise en charge technique",
  description: "Préparation et analyse des prises en charge techniques multi-tech",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
            <span className="text-sm font-semibold text-slate-900">
              Prise en charge technique
            </span>
            {user && (
              <nav className="flex gap-4 text-sm text-slate-500">
                <a href="/contrats" className="hover:text-slate-900">
                  Contrats
                </a>
                <a href="/regles-ape" className="hover:text-slate-900">
                  Règles APE &amp; réglementaire
                </a>
              </nav>
            )}
            {user && (
              <form action={logout} className="ml-auto flex items-center gap-3">
                <span className="text-xs text-slate-400">{user.email}</span>
                <button type="submit" className="text-sm text-slate-500 hover:text-slate-900">
                  Se déconnecter
                </button>
              </form>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
