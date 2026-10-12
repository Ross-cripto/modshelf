import Link from "next/link";
import { ArrowLeft, ArrowRight, GitBranch } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CopyButton } from "@/components/copy-button";
import { ADD_MOD_COMMAND, ARTWORK_COMMAND, MARKETPLACE_REPOSITORY } from "@/lib/project";

export const metadata = { title: "Add a mod — Modshelf" };

export default function ContributePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="subpage contribute-page">
        <Link href="/#explore" className="back-link">
          <ArrowLeft size={15} /> Back to the shelf
        </Link>
        <div className="contribute-hero">
          <div>
            <h1>Your mod.<br />Our next little upgrade.</h1>
            <p className="subpage-intro">
              Good mods deserve a place on the shelf. Our repository skills
              prepare your listing and its hand-drawn artwork, ready for the
              community to review.
            </p>
            <div className="contribute-actions">
              <a href={MARKETPLACE_REPOSITORY} className="button button-rust" target="_blank" rel="noopener noreferrer">
                <GitBranch size={16} /> Open repository <ArrowRight size={15} />
              </a>
              <a href={`${MARKETPLACE_REPOSITORY}/blob/main/CONTRIBUTING.md`} className="text-link" target="_blank" rel="noopener noreferrer">
                Read the contribution guide <ArrowRight size={15} />
              </a>
            </div>
          </div>
          <img className="contribute-art" src="/art/workflow-art.webp" width="1500" height="1049" alt="Ink illustration of a terminal, workflow notes, and connected panels." />
        </div>
        <section className="contribute-steps" aria-labelledby="contribution-heading">
          <h2 id="contribution-heading">A small contribution. A shared shelf.</h2>
          <ol>
            <li><span>01</span><h3>Make yourself at home</h3><p>Fork or clone Modshelf, then open the project in Claude Code.</p></li>
            <li><span>02</span><h3>Let the skill do the prep</h3><p>Share your mod’s repository. The skill reads its source and creates a listing with matching artwork.</p></li>
            <li><span>03</span><h3>Bring it to the community</h3><p>Review the changes and open a pull request. Once merged, your mod joins the shelf.</p></li>
          </ol>
        </section>
        <section className="contribute-skills" aria-labelledby="skills-heading">
          <div className="contribute-section-heading"><GitBranch size={19} /><h2 id="skills-heading">Two skills. One shared style.</h2></div>
          <article className="skill-guide">
            <div className="skill-guide-heading"><h3>Add a mod</h3><CopyButton text={ADD_MOD_COMMAND} /></div>
            <p>From a Claude Code mod repository to a source-linked listing, an original illustration, and a pull request.</p>
            <pre><code>{ADD_MOD_COMMAND}</code></pre>
            <a href={`${MARKETPLACE_REPOSITORY}/blob/main/.claude/skills/add-mod/SKILL.md`} className="text-link" target="_blank" rel="noopener noreferrer">View the skill <ArrowRight size={14} /></a>
          </article>
          <article className="skill-guide">
            <div className="skill-guide-heading"><h3>Create the artwork</h3><CopyButton text={ARTWORK_COMMAND} /></div>
            <p>Give an existing mod a fresh illustration in the shelf’s ink-and-muted-color style.</p>
            <pre><code>{ARTWORK_COMMAND}</code></pre>
            <a href={`${MARKETPLACE_REPOSITORY}/blob/main/.claude/skills/mod-artwork/SKILL.md`} className="text-link" target="_blank" rel="noopener noreferrer">View the skill <ArrowRight size={14} /></a>
          </article>
          <p className="contribute-note">Made for Claude Code function-hook mods. Every listing keeps its source, license, and artwork together in the repository.</p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
