import Link from "next/link";
import { ArrowRight, Asterisk } from "lucide-react";
export function SiteHeader() {
  return (
    <header className="site-header container">
      <Link href="/" className="wordmark" aria-label="Modshelf home">
        <Asterisk aria-hidden="true" />
        <span>modshelf</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#explore">Explore</Link>
        <Link href="/install">Install guide</Link>
      </nav>
      <Link href="/contribute" className="button button-dark header-submit">
        Add a mod
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </header>
  );
}
