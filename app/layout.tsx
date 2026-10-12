import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Modshelf — Make Claude Code a little more you",
  description:
    "Discover and share community-built Claude Code mods. Games, dashboards, workflow tools, and thoughtful little upgrades, all on one shelf.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Modshelf — Claude Code Mods",
    description: "Small mods. A more personal Claude Code.",
    type: "website",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
