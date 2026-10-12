export type FixtureFile = { path: string; label: string; size: string; hidden: boolean; index: number };
export type HeldCommandFixture = { command: string; summary: string; details: string[] };

export function mermaidReplyFixture(prompt: string): string {
  return `Here is a sample flow for “${prompt}”.\n\n\`\`\`mermaid\ngraph TD\n  Request --> Plan --> Result\n\`\`\``;
}

export const FIXTURE_FILES: FixtureFile[] = [
  { path: "src/app.ts", label: "  · app.ts", size: "1.4 KB", hidden: false, index: 1 },
  { path: "src/styles.css", label: "  · styles.css", size: "2.1 KB", hidden: false, index: 2 },
  { path: "tests/app.test.ts", label: "  · app.test.ts", size: "942 B", hidden: false, index: 3 },
  { path: "README.md", label: "· README.md", size: "1.0 KB", hidden: false, index: 4 },
  { path: "package.json", label: "· package.json", size: "408 B", hidden: false, index: 5 },
  { path: ".gitignore", label: "· .gitignore", size: "32 B", hidden: true, index: 6 },
];

export function getFixtureFilePath(index: number): string | null {
  return FIXTURE_FILES.find(file => file.index === index)?.path ?? null;
}

function requestsDatabaseChange(prompt: string): boolean {
  if (/\bmigrat(?:e|ion|ions)\b/i.test(prompt)) return true;
  const mentionsDatabase = /\b(?:database|schema|table)\b/i.test(prompt);
  const requestsChange = /\b(?:remove|delete|drop|alter)\b/i.test(prompt);
  return mentionsDatabase && requestsChange;
}

export function getHeldCommandFixture(prompt: string): HeldCommandFixture | null {
  if (/force[\s-]?push|push\b.*(?:--force|\bforce\b)/i.test(prompt)) {
    return {
      command: "git push --force origin feature/demo",
      summary: "Replace the remote feature branch history.",
      details: ["2 commits would be removed from the remote branch", "Branch and commit counts are fictional fixtures"],
    };
  }
  if (requestsDatabaseChange(prompt)) {
    return {
      command: "npx prisma migrate deploy",
      summary: "Run the pending database migration.",
      details: ["Database impact cannot be previewed safely.", "Review the migration before proceeding · local fixture"],
    };
  }
  if (/\b(?:delete|remove|cleanup|clean up)\b/i.test(prompt)) {
    return {
      command: "rm -rf ./dist",
      summary: "Delete the generated dist directory.",
      details: ["dist/ · 18 files · 240 KiB", "src/ and tests/ would be unaffected"],
    };
  }
  return null;
}

export function browserContextPrompt(url: string): string {
  return `Review the example page at ${url} and suggest improvements.`;
}
