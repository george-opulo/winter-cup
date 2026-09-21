import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Nav } from "./components/Nav";
import { Snow } from "./components/Snow";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-main" });

export const metadata: Metadata = {
  title: "Winter Cup",
  description: "Winter Cup golf — leaderboard, rounds, handicaps and the wheel of destiny",
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <Snow />
        <div className="content">
          <main className="shell">
            <header className="masthead">
              <h1>
                <span className="flake">❄</span>Winter Cup
              </h1>
              <span className="season">2026/27</span>
            </header>
            {children}
          </main>
        </div>
        <Nav />
      </body>
    </html>
  );
}
