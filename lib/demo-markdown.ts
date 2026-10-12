import type { SimulationState } from "./demo-types.ts";

export type MarkdownFixture = { path: string; title: string; before: string[]; after: string[] };
export type MarkdownBlock = { kind: "heading" | "subheading" | "paragraph" | "space"; text: string };

export function parseMarkdownLines(lines: string[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const line of lines) {
    if (line.startsWith("# ")) blocks.push({ kind: "heading", text: line.slice(2) });
    else if (line.startsWith("## ")) blocks.push({ kind: "subheading", text: line.slice(3) });
    else if (!line.trim()) blocks.push({ kind: "space", text: "" });
    else blocks.push({ kind: "paragraph", text: line });
  }
  return blocks;
}

export function getMarkdownFixture(path: string): MarkdownFixture {
  if (path === "CONTRIBUTING.md") {
    return {
      path,
      title: "Contributing",
      before: ["# Contributing", "", "Open an issue with your idea."],
      after: ["# Contributing", "", "Open an issue with your idea.", "", "Run the focused tests before opening a pull request.", "", "Document the mod's trigger and expected behavior."],
    };
  }
  return {
    path: "README.md",
    title: "Example project",
    before: ["# Example project", "", "A small terminal application."],
    after: ["# Example project", "", "A small terminal application.", "", "## Getting started", "", "Run npm install, then npm test.", "", "The change includes a focused test and clear documentation."],
  };
}

export function selectedMarkdownPath(state: SimulationState): string {
  if (state.panel.selection >= 0) return state.markdownFiles[state.panel.selection] ?? "README.md";
  return state.markdownFiles.at(-1) ?? "README.md";
}

export function isKnownMarkdownPath(path: string): boolean {
  return path === "README.md" || path === "CONTRIBUTING.md";
}

export function markdownShowsBefore(state: SimulationState, path: string): boolean {
  return !state.markdownEditedFiles.includes(path);
}
