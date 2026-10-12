"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useDeferredValue, useSyncExternalStore } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  X,
  Bookmark,
  Grid2X2,
  Gamepad2,
  Terminal,
  ChartNoAxesColumn,
  Cog,
  Clock3,
  ShieldCheck,
  Monitor,
  Database,
  Sprout,
} from "lucide-react";
import { CATEGORIES, filterMods, type Mod } from "@/lib/catalog";
import { artworkUrl } from "@/lib/artwork";
import { catalogHeading, catalogDescription } from "@/lib/catalog-presentation";
import { SEED_MODS } from "@/lib/seed-mods";
import { getModDemoHref } from "@/lib/mod-demos";
import { CopyButton } from "./copy-button";

import { getBookmarkSnapshot, getServerBookmarkSnapshot, subscribeBookmarks, writeBookmarks } from "@/lib/bookmarks";
const CATEGORY_ICONS = {
  "All mods": Grid2X2,
  Games: Gamepad2,
  Dashboards: ChartNoAxesColumn,
  Workflow: Cog,
  "While you wait": Clock3,
  "Safety & privacy": ShieldCheck,
  Interface: Monitor,
  "Memory & context": Database,
  Saved: Bookmark,
};

function CategoryIcon({ category }: { category: string }) {
  const Icon =
    CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] ?? Grid2X2;
  return <Icon size={19} strokeWidth={1.6} aria-hidden="true" />;
}

function ModCard({
  mod,
  isSaved,
  onSave,
  onOpen,
}: {
  mod: Mod;
  isSaved: boolean;
  onSave: (id: string) => void;
  onOpen: (mod: Mod) => void;
}) {
  const demoHref = getModDemoHref(mod.id);
  return (
    <article className="mod-card">
      <button
        className="card-main"
        type="button"
        onClick={() => onOpen(mod)}
        aria-label={`Explore ${mod.name}`}
      >
        <div className={`card-art art-${mod.illustration}`}>
          <img
            src={artworkUrl(mod.illustration)}
            width="512"
            height="358"
            alt=""
            loading="lazy"
          />
        </div>
        <div className="card-content">
          <h3>
            {mod.name}
            <ArrowUpRight size={16} className="card-arrow" aria-hidden="true" />
          </h3>
          <p>{mod.description}</p>
        </div>
      </button>
      <div className="card-footer">
        <span>
          <Sprout size={19} strokeWidth={1.6} aria-hidden="true" />
          by {mod.author}
        </span>
        <button
          className={`icon-button save-button ${isSaved ? "is-saved" : ""}`}
          type="button"
          aria-label={`${isSaved ? "Unsave" : "Save"} ${mod.name}`}
          aria-pressed={isSaved}
          onClick={() => onSave(mod.id)}
        >
          <Bookmark size={17} strokeWidth={1.6} />
        </button>
      </div>
      {demoHref && (
        <Link href={demoHref} className="card-demo-action" aria-label={`Try this mod: ${mod.name}`}>
          <Terminal size={16} aria-hidden="true" /> Try this mod <ArrowRight size={14} aria-hidden="true" />
        </Link>
      )}
    </article>
  );
}

function ModDetail({
  mod,
  onClose,
  isSaved,
  onSave,
}: {
  mod: Mod;
  onClose: () => void;
  isSaved: boolean;
  onSave: (id: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  function closeOnBackdrop(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) onClose();
  }
  return (
    <dialog
      ref={dialogRef}
      className="mod-dialog"
      onCancel={onClose}
      onClick={closeOnBackdrop}
      aria-labelledby="mod-detail-title"
    >
      <div className="dialog-content">
        <div className="dialog-actions">
          <span className="category-label">
            <CategoryIcon category={mod.category} />
            {mod.category}
          </span>
          <button
            className="icon-button"
            type="button"
            aria-label="Close mod details"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <img
          className="detail-art"
          src={artworkUrl(mod.illustration)}
          width="512"
          height="358"
          alt=""
        />
        <div className="detail-heading">
          <h2 id="mod-detail-title">{mod.name}</h2>
          <button
            className="icon-button save-button"
            type="button"
            onClick={() => onSave(mod.id)}
            aria-label={`${isSaved ? "Unsave" : "Save"} ${mod.name}`}
            aria-pressed={isSaved}
          >
            <Bookmark size={21} fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="detail-description">{mod.description}</p>
        <p className="detail-byline">
          by {mod.author}
          <span>·</span>
          {mod.license}
          <span>·</span>
          Source-linked mod
        </p>
        <section className="install-block">
          <div>
            <h3>Make it yours</h3>
            <CopyButton text={mod.install} />
          </div>
          <pre>
            <code>{mod.install}</code>
          </pre>
          <p>
            Function hooks must be enabled. Check the mod’s repository for its
            requirements.
          </p>
          <Link href="/install" className="text-link">
            Open the install guide
            <ArrowRight size={15} />
          </Link>
        </section>
        <div className="detail-bottom">
          {mod.repository ? (
            <a
              className="button button-dark"
              href={mod.repository}
              target="_blank"
              rel="noopener noreferrer"
            >
              View source
              <ArrowUpRight size={16} />
            </a>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}

export function Marketplace() {
  const mods = SEED_MODS;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All mods");
  const [sort, setSort] = useState("featured");
  const savedIds = useSyncExternalStore(subscribeBookmarks, getBookmarkSnapshot, getServerBookmarkSnapshot);
  const [selectedMod, setSelectedMod] = useState<Mod | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const deferredQuery = useDeferredValue(query);
  const hasUserFiltered =
    deferredQuery.trim() !== "" || category !== "All mods";
  const visibleMods = filterMods(mods, deferredQuery, category, sort, savedIds);

  function toggleSave(id: string) {
    const isSaved = savedIds.includes(id);
    const nextIds = isSaved
      ? savedIds.filter((savedId) => savedId !== id)
      : [...savedIds, id];
    const persisted = writeBookmarks(nextIds);
    if (persisted) {
      setSaveMessage(
        isSaved ? "Mod removed from saved items." : "Mod saved to your shelf.",
      );
    } else {
      setSaveMessage(
        "Saved for this visit. Your browser could not keep this preference.",
      );
    }
  }

  function resetFilters() {
    setQuery("");
    setCategory("All mods");
    setSort("featured");
  }

  return (
    <>
      <main className="container" id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">
              Make Claude Code
              <br />a little more you.
            </h1>
            <p>
              Discover community-built mods. Games, dashboards,
              <br className="desktop-break" /> and thoughtful little upgrades
              for your Claude Code.
            </p>
            <div className="hero-actions">
              <a href="#explore" className="button button-rust">
                Explore mods
                <ArrowRight size={18} />
              </a>
              <Link href="/install" className="hero-guide">
                How mods work
              </Link>
            </div>
          </div>
          <img
            className="hero-art"
            src={artworkUrl("community")}
            alt="Two people sharing mod cards at a desk with a terminal, plants, books, and coffee."
            width="1835"
            height="834"
            fetchPriority="high"
          />
        </section>
        <section
          className="search-section"
          id="explore"
          aria-labelledby="search-heading"
        >
          <h2 id="search-heading">Find something that fits.</h2>
          <div className="search-field">
            <Search size={22} strokeWidth={1.6} aria-hidden="true" />
            <label className="sr-only" htmlFor="catalog-search">
              Search Claude Code mods
            </label>
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find your next mod..."
              autoComplete="off"
            />
            {query ? (
              <button
                className="icon-button"
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <X size={18} />
              </button>
            ) : (
              <kbd className="search-hint">
                Search by name, creator, or idea
              </kbd>
            )}
          </div>
        </section>
        <section className="catalog-layout" aria-labelledby="catalog-heading">
          <aside className="catalog-sidebar">
            <h2>Categories</h2>
            <nav aria-label="Mod categories">
              {["All mods", ...CATEGORIES].map((item) => (
                <button
                  key={item}
                  className={`category-button ${category === item ? "active" : ""}`}
                  type="button"
                  aria-pressed={category === item}
                  onClick={() => setCategory(item)}
                >
                  <CategoryIcon category={item} />
                  <span>{item}</span>
                </button>
              ))}
              <div className="saved-category">
                <button
                  className={`category-button ${category === "Saved" ? "active" : ""}`}
                  type="button"
                  aria-pressed={category === "Saved"}
                  onClick={() => setCategory("Saved")}
                >
                  <Bookmark size={18} />
                  <span>Saved mods</span>
                  <span className="saved-count">{savedIds.length}</span>
                </button>
              </div>
            </nav>
            <div className="sidebar-contribute">
              <Sprout size={31} strokeWidth={1.3} />
              <h3>Made something useful?</h3>
              <p>There’s a place for it here.</p>
              <Link href="/contribute" className="text-link">
                Share your mod
                <ArrowRight size={15} />
              </Link>
            </div>
          </aside>
          <div className="catalog-main">
            <div className="catalog-toolbar">
              <div>
                <h2 id="catalog-heading">
                  {catalogHeading(category)}
                </h2>
                <p>
                  {catalogDescription(hasUserFiltered, visibleMods.length)}
                </p>
              </div>
              <div className="catalog-sort">
                <label htmlFor="catalog-sort">Sort by</label>
                <select
                  id="catalog-sort"
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="newest">Newest first</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </div>
            <div className="mobile-categories">
              <label htmlFor="mobile-category">Category</label>
              <select
                id="mobile-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {["All mods", ...CATEGORIES, "Saved"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </div>
            <div aria-live="polite" className="sr-only">
              {visibleMods.length} mods shown.
            </div>
            {visibleMods.length ? (
              <div className="mod-grid">
                {visibleMods.map((mod) => (
                  <ModCard
                    key={mod.id}
                    mod={mod}
                    isSaved={savedIds.includes(mod.id)}
                    onSave={toggleSave}
                    onOpen={setSelectedMod}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Search size={31} strokeWidth={1.2} />
                <h3>
                  {category === "Saved"
                    ? "Your shelf is waiting."
                    : "Nothing on this shelf yet."}
                </h3>
                <p>
                  {category === "Saved"
                    ? "Save a mod with the bookmark button. It will be right here when you return."
                    : "Try a different search or explore another category."}
                </p>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={resetFilters}
                >
                  Explore all mods
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </section>
        <section className="contribution-section">
          <div>
            <h2>Good mods are better shared.</h2>
            <p>
              Bring your mod to the repository. Our skills prepare the listing
              <br />
              and matching artwork, ready for a pull request.
            </p>
          </div>
          <Link href="/contribute" className="button button-rust">
            Share your mod
            <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      {selectedMod ? (
        <ModDetail
          mod={selectedMod}
          onClose={() => setSelectedMod(null)}
          isSaved={savedIds.includes(selectedMod.id)}
          onSave={toggleSave}
        />
      ) : null}
      <span className="sr-only" role="status">
        {saveMessage}
      </span>
    </>
  );
}
