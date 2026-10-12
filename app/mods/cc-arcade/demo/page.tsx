import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Arcade2048 } from "@/components/arcade-2048";
import styles from "@/components/arcade-2048.module.css";

export const metadata = {
  title: "Play cc-arcade 2048 — Modshelf",
  description: "Try cc-arcade's 2048 in your browser. Merge tiles with arrow keys or swipes, then bring the arcade to Claude Code.",
};

const GAME_SOURCE = "https://github.com/sezaakgun/cc-arcade/blob/0baff06d31295850283c2eebe052f39bbc35473f/hooks/games/twenty48.ts";

export default function ArcadeDemoPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={`container ${styles.page}`}>
        <Link href="/#explore" className={`back-link ${styles.backLink}`}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to the shelf
        </Link>
        <div className={styles.intro}>
          <h1>2048. A little break.</h1>
          <p>Try cc-arcade’s terminal interface in a playable browser preview.</p>
        </div>
        <div className={styles.layout}>
          <Arcade2048 />
          <aside className={styles.about} aria-label="About cc-arcade">
            <img className={styles.art} src="/art/arcade-art.webp" width="512" height="358" alt="Hand-drawn arcade machine in muted rust and sage." />
            <div>
            <h2>Meet cc-arcade.</h2>
            <p className={styles.byline}>by <a href="https://github.com/sezaakgun" target="_blank" rel="noopener noreferrer">Seza Akgün</a> · MIT</p>
            <p className={styles.description}>Little games for the moments between prompts. Install cc-arcade to bring 2048 and more to your Claude Code terminal.</p>
            <div className={styles.aboutActions}>
              <Link className="button button-dark" href="/install">How to install</Link>
              <a className={styles.source} href="https://github.com/sezaakgun/cc-arcade" target="_blank" rel="noopener noreferrer">View mod source <ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>
            </div>
            <p className={styles.credit}>Adapted from cc-arcade’s <a href={GAME_SOURCE} target="_blank" rel="noopener noreferrer">original rules</a> and <a href="https://github.com/sezaakgun/cc-arcade/blob/0baff06d31295850283c2eebe052f39bbc35473f/hooks/boards/twenty48.tsx" target="_blank" rel="noopener noreferrer">terminal renderer</a>. The game runs in your browser. <a href="/licenses/cc-arcade-MIT.txt">Read the license</a>.</p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
