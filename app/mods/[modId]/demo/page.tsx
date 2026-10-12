import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DemoSwitcher, ModTerminalDemo } from "@/components/mod-terminal-demo";
import { DEMO_IDS, isDemoId } from "@/lib/mod-demos";
import { getDemoDefinition } from "@/lib/demo-registry";
import { SEED_MODS } from "@/lib/seed-mods";
import { artworkUrl } from "@/lib/artwork";
import styles from "@/components/mod-terminal-demo.module.css";

type Props = { params: Promise<{ modId: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return DEMO_IDS.map(modId => ({ modId })); }
export async function generateMetadata({ params }: Props) {
  const { modId } = await params;
  const mod = SEED_MODS.find(entry => entry.id === modId);
  return { title: `Try ${mod?.name ?? "a mod"} — Modshelf`, description: `Try ${mod?.name ?? "a Claude Code mod"} in a local, prompt-driven terminal simulation.` };
}
export default async function ModDemoPage({ params }: Props) {
  const { modId } = await params;
  if (!isDemoId(modId)) notFound();
  const mod = SEED_MODS.find(entry => entry.id === modId);
  if (!mod) notFound();
  const definition = getDemoDefinition(modId);
  return <><SiteHeader /><main id="main-content" className={`container ${styles.page}`}>
    <Link href="/#explore" className={styles.back}><ArrowLeft size={15} aria-hidden="true" /> Back to the shelf</Link>
    <div className={styles.intro}><div><h1>Try {mod.name}.</h1><p>Send a message. Watch Claude work. See how this mod changes the terminal.</p></div><DemoSwitcher current={modId} options={SEED_MODS.filter(entry => isDemoId(entry.id)).map(entry => ({ id: entry.id, name: entry.name }))} /></div>
    <ModTerminalDemo id={modId} key={modId} />
    <aside className={styles.about} aria-label={`About ${mod.name}`}><img className={styles.art} src={artworkUrl(mod.illustration)} alt={`Hand-drawn illustration for ${mod.name}`} width="512" height="358" /><div><h2>Bring it to your terminal.</h2><p>{mod.description}</p><p>By {mod.author} · {mod.license}</p><div className={styles.links}><Link href="/install">How to install <ArrowUpRight size={14} aria-hidden="true" /></Link><a href={mod.repository} target="_blank" rel="noopener noreferrer">View mod source <ArrowUpRight size={14} aria-hidden="true" /></a><a href={definition.source} target="_blank" rel="noopener noreferrer">Demo reference <ArrowUpRight size={14} aria-hidden="true" /></a></div><p>Recreated from the linked source. Files, tool results, usage and replies are local examples. Community authors retain credit for their mods.</p></div></aside>
  </main><SiteFooter /></>;
}
