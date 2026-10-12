import Link from "next/link";
import { Asterisk, ArrowUpRight } from "lucide-react";
import { MARKETPLACE_REPOSITORY } from "@/lib/project";
export function SiteFooter() {
  return (
    <footer className="site-footer container">
      <div className="footer-top">
        <Link href="/" className="wordmark">
          <Asterisk aria-hidden="true" />
          <span>modshelf</span>
        </Link>
        <p>Small mods. A more personal Claude Code.</p>
        <a href={MARKETPLACE_REPOSITORY} className="text-link" target="_blank" rel="noopener noreferrer">
          Open-source project
          <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </div>
      <div className="footer-bottom">
        <p>An independent community catalog. Not affiliated with Anthropic.</p>
        <div>
          <Link href="/install">Install guide</Link>
          <Link href="/contribute">Contribute a mod</Link>
          <a href="/modshelf-source.zip" download>Download source</a>
        </div>
      </div>
    </footer>
  );
}
