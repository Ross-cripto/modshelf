import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CopyButton } from "@/components/copy-button";
export const metadata = { title: "How mods work — Modshelf" };
const ENABLE_HOOKS = "export CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1\nclaude";
const ARCADE_INSTALL =
  "claude plugin marketplace add sezaakgun/cc-arcade\nclaude plugin install cc-arcade@cc-arcade";
export default function InstallPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="subpage">
        <Link href="/#explore" className="back-link">
          <ArrowLeft size={15} />
          Back to the shelf
        </Link>
        <h1>
          A little mod.
          <br />A different kind of Claude.
        </h1>
        <p className="subpage-intro">
          Mods use Claude Code’s function hooks to add interactive panels,
          games, dashboards, and other experiences directly to your terminal.
        </p>
        <img
          className="guide-intro-art"
          src="/art/workflow-art.webp"
          width="1500"
          height="1049"
          alt="Hand-drawn terminal connected to small workflow panels."
        />
        <section className="guide-section">
          <h2>Start with the requirements</h2>
          <p>
            Function hooks are an early-access feature. Check each mod’s
            repository for the supported Claude Code version and platform before
            installing. Some mods also need a separate tool, such as Homebrew or
            tmux.
          </p>
          <p>
            Find a mod you like and open <strong>View source</strong> to read
            its README, license, and install notes.
          </p>
        </section>
        <section className="guide-section">
          <CopyButton text={ENABLE_HOOKS} />
          <h2>Enable function hooks</h2>
          <p>
            On macOS or Linux, start Claude Code with function hooks enabled:
          </p>
          <pre>
            <code>{ENABLE_HOOKS}</code>
          </pre>
          <p>
            For a persistent setup, add the export to your shell configuration.
            On Windows, use your shell’s environment-variable syntax.
          </p>
        </section>
        <section className="guide-section">
          <CopyButton text={ARCADE_INSTALL} />
          <h2>Add a mod to your terminal</h2>
          <p>
            Each listing includes its own installation instructions. For
            example,{" "}
            <a
              href="https://github.com/sezaakgun/cc-arcade"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC Arcade
            </a>{" "}
            uses:
          </p>
          <pre>
            <code>{ARCADE_INSTALL}</code>
          </pre>
          <p>
            Follow the repository’s instructions, then restart Claude Code if
            required. You can manage installed plugins using{" "}
            <code>/plugin</code> inside Claude Code.
          </p>
        </section>
        <section className="guide-section">
          <h2>Keep your setup yours</h2>
          <p>
            Mods run code in your local environment. Read the source and
            permissions of any mod before installing it. Modshelf links to
            community projects; each creator maintains their own mod.
          </p>
          <p>
            Save anything interesting with the bookmark button. Your saved shelf
            stays in this browser.
          </p>
          <Link href="/#explore" className="text-link">
            Find your first mod
            <ArrowRight size={15} />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
