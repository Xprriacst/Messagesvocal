import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceCast — diffusion de messages vocaux",
  description: "Uploade ton CSV et ton MP3, on dépose ton message sur le répondeur de chaque contact."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-10">
          <header className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <path d="M12 19v4" />
                </svg>
              </div>
              <div className="font-semibold tracking-tight">VoiceCast</div>
            </div>
            <a
              href="https://www.voicepartner.fr/"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Powered by Voice Partner
            </a>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="mt-16 text-center text-xs text-slate-400">
            MVP — déposez vos messages vocaux sur les répondeurs de vos clients.
          </footer>
        </div>
      </body>
    </html>
  );
}
