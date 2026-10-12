export const DEMO_IDS = [
  "cc-arcade", "cctop", "flowpane", "mindful-claude", "context-lens", "cc-dino",
  "quota-meter", "token-ledger", "budget-guard", "mermaid-draw", "prompt-queue",
  "mission-control", "blast-radius", "md-preview", "now-playing", "terminal-browser",
  "image-view", "prismantis", "flightdeck", "filetree", "prompt-rail",
  "pull-request-pane", "taskline", "clawd-buddy",
] as const;

export type DemoId = typeof DEMO_IDS[number];

export function isDemoId(value: string): value is DemoId {
  return DEMO_IDS.some(id => id === value);
}

export function getModDemoHref(modId: string): string | null {
  if (isDemoId(modId)) return `/mods/${modId}/demo`;
  return null;
}
