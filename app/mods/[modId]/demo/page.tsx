import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CopyButton } from "@/components/copy-button";
import { ModTerminalDemo } from "@/components/mod-terminal-demo";
import { DEMO_IDS, isDemoId } from "@/lib/mod-demos";
import { SEED_MODS } from "@/lib/seed-mods";
import styles from "@/components/mod-terminal-demo.module.css";

type Props = { params: Promise<{ modId: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return DEMO_IDS.map(modId => ({ modId }));
}

export async function generateMetadata({ params }: Props) {
  const { modId } = await params;
  const mod = SEED_MODS.find(entry => entry.id === modId);
  const name = mod?.name ?? "a Claude Code mod";
  return {
    title: `Try ${name} — Modshelf`,
    description: `An interactive terminal preview of ${name}.`,
  };
}

export default async function ModDemoPage({ params }: Props) {
  const { modId } = await params;
  if (!isDemoId(modId)) notFound();
  const mod = SEED_MODS.find(entry => entry.id === modId);
  if (!mod) notFound();

  return (
    <>
      <SiteHeader />
      <main id="main-content" className={`container ${styles.page}`}>
        <Link href="/#explore" className={styles.back}>
          <ArrowLeft size={15} aria-hidden="true" /> Back to the shelf
        </Link>
        <div className={styles.intro}>
          <h1>{mod.name}</h1>
          <p>Interactive preview</p>
        </div>
        <ModTerminalDemo id={modId} key={modId} />
        <section className={styles.about} aria-labelledby="install-mod-title">
          <div className={styles.aboutHeading}>
            <h2 id="install-mod-title">Make it yours.</h2>
            <p>By {mod.author} · {mod.license}</p>
          </div>
          <div className="install-block">
            <div><CopyButton text={mod.install} /></div>
            <pre><code>{mod.install}</code></pre>
            <div className={styles.links}>
              <Link href="/install">How to install <ArrowUpRight size={14} aria-hidden="true" /></Link>
              <a href={mod.repository} target="_blank" rel="noopener noreferrer">View mod source <ArrowUpRight size={14} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
