import type { Metadata, Viewport } from "next";
import { Archivo, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "./components/Nav";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
});

const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Winter Cup",
  description: "Winter Cup golf — leaderboard, rounds, handicaps and the wheel",
};

export const viewport: Viewport = {
  themeColor: "#eeebe3",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${splineMono.variable}`}>
      <body style={{ ["--font-body" as string]: "var(--font-display)" }}>
        <main className="shell">
          {/* Swap the wordmark for the logo <img> when it's ready */}
          <header className="masthead">
            <h1 className="wordmark">Winter Cup</h1>
            <span className="season">7 players · Sep—Mar · 2026/27</span>
          </header>
          {children}
        </main>
        <Nav />
      </body>
    </html>
  );
}
