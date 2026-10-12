import { AGENT_TICK, CHECK_TICK, EDIT_TICK, READ_TICK, REPLY_TICK, SIMULATION_TICK_MS, MUSIC_DURATION_SECONDS } from "../demo-config.ts";
import { actionRow, bar, color, fitText, plainRow, wrapTerminalText } from "../demo-render.ts";
import { getHeldCommandFixture } from "../demo-fixtures.ts";
import type { DemoButton, DemoDefinition, DemoPanel, DemoRow, DemoUsage, SimulationState } from "../demo-types.ts";

const WARNING_PERCENT = 80;
const QUOTA_YELLOW_PERCENT = 50;
const BLAST_TIMEOUT_SECONDS = 60;
const MAX_LEDGER_ROWS = 8;
const MISSION_GRAPHIC_HEIGHT = 8;
const MARKDOWN_GRAPHIC_HEIGHT = 10;
const DIM = "2";
const GREEN = "32";
const YELLOW = "33";
const RED = "31";
const CYAN = "36";
const BLUE = "38;2;90;169;255";
const ORANGE = "38;2;255;162;76";
const CHANGED_GREEN = "38;2;61;220;132";
const MUSIC_GREEN = "38;2;29;185;84";

export const HOOK_DEMOS: DemoDefinition[] = [
  {
    id: "quota-meter", placement: "under-prompt", startupCommand: "", startsOpen: false, initialTab: "Quota",
    example: "Review the project and suggest a small improvement.",
    instructions: "Send a message. Plan limits arrive after the reply; /quota opens the detail pane. The sampled bars stay still during tool calls.",
    limitation: "Plan usage and reset times are fixtures. The real mod samples your subscription after each turn and every 60 seconds; API-key sessions do not report plan limits.",
    source: "https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/quota-meter/hooks/register.tsx",
    controls: [{ label: "Toggle quota pane", action: { type: "toggle" } }],
  },
  {
    id: "token-ledger", placement: "under-prompt", startupCommand: "", startsOpen: false, initialTab: "Ledger",
    example: "Explain the project and add a focused test.",
    instructions: "Send one or more messages. /ledger opens the table; a row is recorded when a turn finishes, rather than while tokens stream.",
    limitation: "Tokens and session cost are local fixtures, not account usage or a pricing estimate. History lasts only for this browser demo.",
    source: "https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/token-ledger/hooks/register.tsx",
    controls: [{ label: "Toggle ledger pane", action: { type: "toggle" } }],
  },
  {
    id: "budget-guard", placement: "gate", startupCommand: "/guard cost 0.02", startsOpen: false, initialTab: "Budget",
    example: "Inspect the project, make the change, and run the tests.",
    instructions: "This demo starts with a $0.02 cap so you can see the guard. Send a message, then choose whether to override a held turn. /guard cost 0.20 raises the limit.",
    limitation: "The real mod has no custom dashboard: it warns in the host status and stops tools or asks before a new prompt. The small cap and costs here are demonstration fixtures.",
    source: "https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/register.tsx",
    controls: [{ label: "Set $0.02 cap", action: { type: "budget", dollars: 0.02 } }, { label: "Raise to $0.20", action: { type: "budget", dollars: 0.2 } }],
  },
  {
    id: "mermaid-draw", placement: "transcript", startupCommand: "", startsOpen: true, initialTab: "Color",
    example: "Draw a Mermaid diagram of the request, worker, and reply flow.",
    instructions: "Ask for a diagram and watch the fenced reply become terminal art once its closing fence arrives. /mermaid ascii off restores the source; /mermaid color off removes colors.",
    limitation: "The response and supported diagram are local fixtures. This preview demonstrates replacement of a completed Mermaid block; it does not run a general Mermaid parser.",
    source: "https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/register.ts",
    controls: [{ label: "Toggle ASCII", action: { type: "render-toggle" } }, { label: "Plain", action: { type: "tab", value: "Plain" } }, { label: "Color", action: { type: "tab", value: "Color" } }, { label: "Toggle direction", action: { type: "orientation-toggle" } }],
  },
  {
    id: "prompt-queue", placement: "above-prompt", startupCommand: "", startsOpen: true, initialTab: "Queue",
    example: "Improve the button and check the result.",
    instructions: "Send a message, then type /q followed by a second task. The queue waits for the current reply. Its ▶ button steers the next successful main tool result while Claude is working.",
    limitation: "Queue, ordering, and steering are local. Ordinary messages are never queued automatically; queued turns use the same simulated work loop and a 5.2-second minimum gap.",
    source: "https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-queue/hooks/register.ts",
    controls: [{ label: "Queue a follow-up", action: { type: "fill-composer", text: "/q Add a focused test for the change" } }, { label: "Clear queue", action: { type: "queue-clear" } }],
  },
  {
    id: "mission-control", placement: "right-pane", startupCommand: "/mission who", startsOpen: true, initialTab: "Who",
    example: "Review the app, delegate a test check, and update the documentation.",
    instructions: "Send a task. Who follows main and subagent tool calls; Code shows the files being read and edited. Use Who, Code, and Close, or /mission to reopen the pane.",
    limitation: "The agents, file imports, and summaries belong to a fictional project. The map recreates the mod's file states without calling its summary model or reading your files.",
    source: "https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/mission-control/hooks/register.tsx",
    controls: [{ label: "Who", key: "w", action: { type: "tab", value: "Who" } }, { label: "Code", key: "c", action: { type: "tab", value: "Code" } }, { label: "Close", key: "q", action: { type: "close" } }],
  },
  {
    id: "blast-radius", placement: "gate", startupCommand: "", startsOpen: false, initialTab: "Command",
    example: "Delete the generated dist folder and run the checks.",
    instructions: "Ask to delete generated files, force-push, or run a migration. Before the simulated risky command, Blast Radius shows its effect and waits for Cancel or Proceed.",
    limitation: "The paths and impact are fixtures. Cancel and Proceed change only this local work loop; no shell command, migration, or Git operation is executed. The held command automatically cancels after 60 seconds.",
    source: "https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/blast-radius/hooks/register.tsx",
    controls: [],
  },
  {
    id: "md-preview", placement: "right-pane", startupCommand: "", startsOpen: false, initialTab: "Single",
    example: "Update README.md and CONTRIBUTING.md to explain the new feature.",
    instructions: "Send a documentation task. A successful Markdown edit adds a notification; /md opens its preview. Compare Before and After, step between files, and switch Page or Text.",
    limitation: "The Markdown files and before/after snapshots are fixtures. Page mode uses a local rendered preview rather than Chrome, GitHub rendering, or your real repository.",
    source: "https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/register.tsx",
    controls: [{ label: "Open latest (/md)", action: { type: "open" } }, { label: "Previous file", key: "p", action: { type: "navigate", delta: -1 } }, { label: "Next file", key: "n", action: { type: "navigate", delta: 1 } }, { label: "Toggle Page / Text", key: "t", action: { type: "render-toggle" } }, { label: "Close", key: "q", action: { type: "close" } }],
  },
  {
    id: "now-playing", placement: "above-prompt", startupCommand: "", startsOpen: true, initialTab: "Music",
    example: "Inspect the project and explain what you would change.",
    instructions: "The playback strip keeps time while you type, while Claude works, and after the reply. /music toggles play or pause; /music next and /music prev change tracks.",
    limitation: "Track names, artist, and lyric lines are original local fixtures. No music plays and no Spotify account or lyric service is contacted.",
    source: "https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/now-playing/hooks/register.tsx",
    controls: [{ label: "Previous track", key: "b", action: { type: "music-prev" } }, { label: "Play / Pause", key: "p", action: { type: "music-toggle" } }, { label: "Next track", key: "n", action: { type: "music-next" } }],
  },
];

function fitRows(rows: DemoRow[], columns: number): DemoRow[] {
  return rows.map(row => ({ ...row, text: fitText(row.text, columns) }));
}

function money(dollars: number): string {
  return `$${dollars.toFixed(3)}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function quotaColor(percent: number): string {
  if (percent >= WARNING_PERCENT) return RED;
  if (percent >= QUOTA_YELLOW_PERCENT) return YELLOW;
  return GREEN;
}

function quotaRows(label: string, percent: number, reset: string, columns: number): DemoRow[] {
  return [plainRow(color(`${label} · ${percent}% used`, "1")), plainRow(color(bar(percent, Math.max(8, columns - 2)), quotaColor(percent))), plainRow(color(reset, DIM)), plainRow("")];
}

function renderQuota(state: SimulationState, columns: number): DemoPanel {
  const sample = state.completed.at(-1)?.usage;
  if (!sample) {
    const status = "quota: no plan limits reported yet";
    if (!state.panel.open) return { rows: [], status };
    return { status, rows: fitRows([
      plainRow(color("Quota", "1")),
      plainRow(color("No plan limits reported yet.", DIM)),
      plainRow(color("Subscription sessions report them after a reply.", DIM)),
      plainRow(color("API-key sessions do not report plan limits.", DIM)),
      actionRow([{ label: "Close", action: { type: "close" } }]),
    ], columns) };
  }
  const status = `quota: 5h ${sample.fiveHour}% · 7d ${sample.sevenDay}%`;
  if (!state.panel.open) return { rows: [], status };
  return { status, rows: fitRows([
    ...quotaRows("5-hour window", sample.fiveHour, "resets in 3h 42m · fixture", columns),
    ...quotaRows("7-day window", sample.sevenDay, "resets in 4d 8h · fixture", columns),
    plainRow(color("Sampled after each turn and every 60s.", DIM)),
    actionRow([{ label: "Close", action: { type: "close" } }]),
  ], columns) };
}

function completedTotals(state: SimulationState): DemoUsage {
  const totals: DemoUsage = { input: 0, output: 0, cached: 0, cost: 0, context: 0, fiveHour: 0, sevenDay: 0 };
  for (const turn of state.completed) {
    totals.input += turn.usage.input;
    totals.output += turn.usage.output;
    totals.cached += turn.usage.cached;
    totals.cost = turn.usage.cost;
  }
  return totals;
}

function cachePercent(usage: DemoUsage): number {
  const totalInput = usage.input + usage.cached;
  if (totalInput === 0) return 0;
  return Math.round(usage.cached / totalInput * 100);
}

function turnCostDelta(state: SimulationState, turnIndex: number): number {
  const previousTotal = state.completed[turnIndex - 1]?.usage.cost ?? 0;
  const currentTotal = state.completed[turnIndex]?.usage.cost ?? previousTotal;
  return Math.max(0, currentTotal - previousTotal);
}

function renderLedger(state: SimulationState, columns: number): DemoPanel {
  const latest = state.completed.at(-1);
  if (!latest) {
    const status = "ledger: no finished turns yet";
    if (!state.panel.open) return { rows: [], status };
    return { status, rows: fitRows([plainRow(color("Token ledger", "1")), plainRow(color("No turns yet. Send a prompt and the first row lands here.", DIM)), actionRow([{ label: "Close", action: { type: "close" } }])], columns) };
  }
  const totals = completedTotals(state);
  const latestCost = turnCostDelta(state, state.completed.length - 1);
  const status = `ledger: session ${money(totals.cost)} · last ${money(latestCost)} · in ${formatNumber(latest.usage.input)} / out ${formatNumber(latest.usage.output)} · cache ${cachePercent(latest.usage)}%`;
  if (!state.panel.open) return { rows: [], status };
  const rows: DemoRow[] = [plainRow(color("Token ledger", "1")), plainRow(color("Turn  Input      Output    Cached    Cost", "1"))];
  const completed = state.completed.slice(-MAX_LEDGER_ROWS).reverse();
  for (const turn of completed) {
    const cost = turnCostDelta(state, state.completed.indexOf(turn));
    rows.push(plainRow(`${String(turn.turn).padEnd(6)}${formatNumber(turn.usage.input).padEnd(11)}${formatNumber(turn.usage.output).padEnd(10)}${formatNumber(turn.usage.cached).padEnd(10)}${money(cost)}`));
  }
  rows.push(plainRow(color("─".repeat(Math.min(columns, 46)), DIM)));
  rows.push(plainRow(color(`Total ${formatNumber(totals.input)} in · ${formatNumber(totals.output)} out · ${money(totals.cost)}`, "1")));
  rows.push(plainRow(color("Local fixture usage · newest turn first", DIM)));
  rows.push(actionRow([{ label: "Close", action: { type: "close" } }]));
  return { rows: fitRows(rows, columns), status };
}

function renderBudget(state: SimulationState, columns: number): DemoPanel {
  if (!state.budget.enabled || state.budget.dollars <= 0) return { rows: [] };
  if (state.decision === "budget") {
    return { rows: fitRows([
      plainRow(color("Budget", "1")),
      plainRow(color(`Session cost ${money(state.usage.cost)} is past the ${money(state.budget.dollars)} limit.`, YELLOW)),
      plainRow("Send this prompt anyway?"),
      actionRow([{ label: "Send anyway", action: { type: "override" } }, { label: "Do not send", action: { type: "deny" } }]),
      plainRow(color("Override lasts one main turn.", DIM)),
    ], columns) };
  }
  const percent = state.usage.cost / state.budget.dollars * 100;
  if (percent < WARNING_PERCENT || state.budget.overridden) return { rows: [] };
  return { rows: [], status: `budget-guard: session cost ${money(state.usage.cost)} / ${money(state.budget.dollars)}${state.budget.warnOnly ? " · warn mode" : ""}` };
}

function mermaidFence(isComplete: boolean): DemoRow[] {
  const rows = [plainRow("```mermaid"), plainRow("graph LR"), plainRow("  Request --> Plan --> Result")];
  if (isComplete) rows.push(plainRow("```"));
  return rows;
}

function mermaidArt(state: SimulationState): DemoRow[] {
  let lines: string[];
  if (state.panel.vertical) {
    lines = ["┌─────────┐", "│ Request │", "└────┬────┘", "     ↓", "┌────┴────┐", "│ Plan    │", "└────┬────┘", "     ↓", "┌────┴────┐", "│ Result  │", "└─────────┘"];
  } else {
    lines = ["┌─────────┐   ┌────────┐   ┌────────┐", "│ Request ├──→│ Plan   ├──→│ Result │", "└─────────┘   └────────┘   └────────┘"];
  }
  if (state.panel.tab === "Plain") return lines.map(plainRow);
  return lines.map(line => plainRow(color(line.replace(/→|↓/g, arrow => color(arrow, YELLOW) + `\u001b[${CYAN}m`), CYAN)));
}

function renderMermaid(state: SimulationState, columns: number): DemoPanel {
  if (!/diagram|flow|architecture|sequence|graph/i.test(state.prompt)) return { rows: [] };
  if (state.phase === "idle" || state.tick < REPLY_TICK) return { rows: [] };
  const isComplete = state.phase === "complete";
  if (!isComplete || !state.panel.rendered) return { rows: fitRows(mermaidFence(isComplete), columns) };
  return { rows: fitRows(mermaidArt(state), columns) };
}

function queueStateLabel(state: SimulationState): string {
  if (state.steering.length > 0) return "waiting for next tool";
  if (state.phase === "working" || state.phase === "decision") return "waiting for Claude";
  return "ready";
}

function queueRowButtons(index: number, count: number): DemoButton[] {
  const buttons: DemoButton[] = [];
  if (index > 0) buttons.push({ label: "↑", action: { type: "queue-up", index } });
  if (index < count - 1) buttons.push({ label: "↓", action: { type: "queue-down", index } });
  buttons.push({ label: "▶", action: { type: "queue-now", index } });
  buttons.push({ label: "edit", action: { type: "queue-edit", index } });
  buttons.push({ label: "✕", action: { type: "queue-remove", index } });
  return buttons;
}

function renderQueue(state: SimulationState, columns: number): DemoPanel {
  const count = state.queue.length + state.steering.length;
  if (count === 0) return { rows: [] };
  const width = Math.max(8, columns - 2);
  const rows: DemoRow[] = [plainRow(color(`╭${"─".repeat(width)}╮`, DIM)), plainRow(color(`queued · ${count} · ${queueStateLabel(state)}`, DIM))];
  for (const prompt of state.steering) rows.push(plainRow(color(`▶ ${prompt} · next main tool`, CYAN)));
  for (const [index, prompt] of state.queue.entries()) {
    rows.push(plainRow(`${index + 1}  ${prompt}`));
    rows.push(actionRow(queueRowButtons(index, state.queue.length)));
  }
  rows.push(actionRow([{ label: "clear", action: { type: "queue-clear" } }]));
  rows.push(plainRow(color(`╰${"─".repeat(width)}╯`, DIM)));
  return { rows: fitRows(rows, columns) };
}

function missionControls(): DemoRow {
  return actionRow([{ label: "Who", key: "w", action: { type: "tab", value: "Who" } }, { label: "Code", key: "c", action: { type: "tab", value: "Code" } }, { label: "Close", key: "q", action: { type: "close" } }]);
}

function missionToolRow(label: string, isDone: boolean): DemoRow {
  const marker = isDone ? "✓" : "●";
  return plainRow(color(`${marker} ${label}`, isDone ? DIM : YELLOW));
}

function renderMissionWho(state: SimulationState, columns: number): DemoPanel {
  const rows: DemoRow[] = [missionControls()];
  if (state.turn === 0) {
    rows.push(plainRow(color("Nothing yet. Start a task and watch it fill in.", DIM)));
    return { rows: fitRows(rows, columns) };
  }
  const isComplete = state.phase === "complete";
  const isStopped = state.phase === "stopped";
  const mainColor = isComplete ? GREEN : YELLOW;
  rows.push(plainRow(color(`${isComplete ? "✓" : "●"} main · ${state.prompt}`, isStopped ? RED : mainColor)));
  if (state.tick >= READ_TICK) rows.push(missionToolRow("├─ Read src/app.ts", isComplete || state.tick >= AGENT_TICK));
  if (state.tick >= AGENT_TICK) {
    rows.push(plainRow(color("├─ agent · test reviewer", isComplete || state.tick >= REPLY_TICK ? GREEN : YELLOW)));
    rows.push(missionToolRow("│  └─ Read tests/app.test.ts", isComplete || state.tick >= EDIT_TICK));
  }
  if (state.tick >= EDIT_TICK) rows.push(missionToolRow("├─ Edit src/app.ts", isComplete || state.tick >= CHECK_TICK));
  if (state.tick >= CHECK_TICK) rows.push(missionToolRow("└─ Bash npm test", isComplete || state.tick >= REPLY_TICK));
  rows.push(plainRow(color("1 agent · main tools appear as they finish", DIM)));
  return { rows: fitRows(rows, columns) };
}

function blankRows(count: number): DemoRow[] {
  return Array.from({ length: count }, () => plainRow(""));
}

function renderMissionCode(state: SimulationState, columns: number): DemoPanel {
  const rows: DemoRow[] = [missionControls(), plainRow(color("Code map · example-project", "1"))];
  if (state.turn === 0) {
    rows.push(plainRow(color("The code map fills from file tool calls.", DIM)));
    return { rows: fitRows(rows, columns) };
  }
  rows.push(...blankRows(MISSION_GRAPHIC_HEIGHT));
  rows.push(plainRow(`${color("read", BLUE)} · ${color("editing", ORANGE)} · ${color("changed", CHANGED_GREEN)}`));
  if (state.phase === "complete") rows.push(plainRow(color("src/app.ts updated · fixture summary", DIM)));
  return { rows: fitRows(rows, columns), graphic: "files", graphicOffset: 2, graphicHeight: MISSION_GRAPHIC_HEIGHT };
}

function renderMission(state: SimulationState, columns: number): DemoPanel {
  if (!state.panel.open) return { rows: [], status: "◈ mission · /mission opens the pane" };
  if (state.panel.tab === "Code") return renderMissionCode(state, columns);
  return renderMissionWho(state, columns);
}

function renderBlast(state: SimulationState, columns: number): DemoPanel {
  if (state.decision !== "command") return { rows: [] };
  const held = getHeldCommandFixture(state.prompt);
  if (!held) return { rows: [] };
  const elapsedSeconds = Math.floor((state.clockTick - state.decisionTick) * SIMULATION_TICK_MS / 1000);
  const secondsLeft = Math.max(0, BLAST_TIMEOUT_SECONDS - elapsedSeconds);
  const rows: DemoRow[] = [];
  for (const line of wrapTerminalText("⚠ Blast Radius held a command", columns)) rows.push(plainRow(color(line, `1;${RED}`)));
  for (const line of wrapTerminalText(`$ ${held.command}`, columns)) rows.push(plainRow(color(line, YELLOW)));
  for (const line of wrapTerminalText(held.summary, columns)) rows.push(plainRow(color(line, "1")));
  for (const detail of held.details) {
    for (const line of wrapTerminalText(detail, Math.max(1, columns - 2))) rows.push(plainRow(color(`  ${line}`, DIM)));
  }
  rows.push(actionRow([{ label: "Cancel", key: "c", action: { type: "deny" } }, { label: "Proceed", key: "y", action: { type: "proceed" } }]));
  rows.push(plainRow(color(`auto-cancels in ${secondsLeft} s`, secondsLeft <= 10 ? YELLOW : DIM)));
  return { rows: fitRows(rows, columns) };
}

function markdownControls(state: SimulationState): DemoRow[] {
  const compareLabel = state.panel.tab === "Before" ? "Single" : "Before";
  return [
    actionRow([{ label: "Prev", key: "p", action: { type: "navigate", delta: -1 } }, { label: "Next", key: "n", action: { type: "navigate", delta: 1 } }, { label: compareLabel, key: "b", action: { type: "tab", value: compareLabel } }]),
    actionRow([{ label: state.panel.rendered ? "Text" : "Page", key: "t", action: { type: "render-toggle" } }, { label: "Close", key: "q", action: { type: "close" } }]),
  ];
}

function markdownFile(state: SimulationState): { path: string; before: string[]; after: string[] } {
  const index = Math.max(0, state.panel.selection) % 2;
  if (index === 1) return { path: "CONTRIBUTING.md", before: ["# Contributing", "Open an issue with your idea."], after: ["# Contributing", "Open an issue with your idea.", "Run the focused tests before opening a pull request.", "Document the mod's trigger and expected behavior."] };
  return { path: "README.md", before: ["# Example project", "A small terminal application."], after: ["# Example project", "A small terminal application.", "## Getting started", "Run npm install, then npm test.", "The change includes a focused test and clear documentation."] };
}

function renderMarkdown(state: SimulationState, columns: number): DemoPanel {
  const hasEdit = state.completed.length > 0 || state.tick >= EDIT_TICK;
  const status = hasEdit ? "md-preview: README.md edited · /md opens the preview" : undefined;
  if (!state.panel.open) return { rows: [], status };
  const rows = markdownControls(state);
  if (!hasEdit) {
    rows.push(plainRow(color("No Markdown edits yet. Send a documentation task.", DIM)));
    return { rows: fitRows(rows, columns) };
  }
  const file = markdownFile(state);
  const index = Math.max(0, state.panel.selection) % 2;
  rows.push(plainRow(color(`${file.path} · ${index + 1}/2 · local fixture`, "1")));
  if (state.panel.rendered) {
    rows.push(...blankRows(MARKDOWN_GRAPHIC_HEIGHT));
    return { rows: fitRows(rows, columns), graphic: "markdown", graphicOffset: 3, graphicHeight: MARKDOWN_GRAPHIC_HEIGHT };
  }
  if (state.panel.tab === "Before") {
    rows.push(plainRow(color("Before", DIM)));
    for (const line of file.before) rows.push(plainRow(color(`- ${line}`, DIM)));
    rows.push(plainRow(color("After", GREEN)));
    for (const line of file.after) rows.push(plainRow(color(`+ ${line}`, GREEN)));
  } else {
    for (const [lineIndex, line] of file.after.entries()) {
      const hasChanged = lineIndex >= file.before.length;
      const prefix = hasChanged ? color("▌ ", GREEN) : "  ";
      rows.push(plainRow(prefix + line));
    }
  }
  return { rows: fitRows(rows, columns) };
}

function musicClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function musicTrack(index: number): { name: string; lyric: string } {
  const normalizedIndex = ((index % 3) + 3) % 3;
  if (normalizedIndex === 1) return { name: "Long Way Home", lyric: "Every small step leaves a light behind" };
  if (normalizedIndex === 2) return { name: "A Quiet Window", lyric: "A quiet window opens to the morning" };
  return { name: "Paper Satellites", lyric: "Fold a little sky and let it find its way" };
}

function renderMusic(state: SimulationState, columns: number): DemoPanel {
  if (!state.panel.open) return { rows: [] };
  const track = musicTrack(state.playback.track);
  const position = Math.min(MUSIC_DURATION_SECONDS, state.playback.position);
  const rows: DemoRow[] = [];
  if (state.playback.playing) {
    rows.push(plainRow(`${color("♫", MUSIC_GREEN)} ${color(track.name, "1")} ${color("· Modshelf demo", DIM)}`));
    rows.push(plainRow(`${color(bar(position / MUSIC_DURATION_SECONDS * 100, 16), MUSIC_GREEN)} ${color(`${musicClock(position)}/${musicClock(MUSIC_DURATION_SECONDS)}`, DIM)}`));
  } else {
    rows.push(plainRow(color(`⏸ ${track.name} · Modshelf demo`, DIM)));
  }
  rows.push(actionRow([{ label: "⏮", key: "b", action: { type: "music-prev" } }, { label: state.playback.playing ? "⏸" : "▶", key: "p", action: { type: "music-toggle" } }, { label: "⏭", key: "n", action: { type: "music-next" } }]));
  if (state.playback.playing) rows.push(plainRow(color(`   ♪ ${track.lyric}`, `3;${DIM}`)));
  return { rows: fitRows(rows, columns) };
}

export function renderHooksDemo(state: SimulationState, columns: number): DemoPanel {
  switch (state.modId) {
    case "quota-meter": return renderQuota(state, columns);
    case "token-ledger": return renderLedger(state, columns);
    case "budget-guard": return renderBudget(state, columns);
    case "mermaid-draw": return renderMermaid(state, columns);
    case "prompt-queue": return renderQueue(state, columns);
    case "mission-control": return renderMission(state, columns);
    case "blast-radius": return renderBlast(state, columns);
    case "md-preview": return renderMarkdown(state, columns);
    case "now-playing": return renderMusic(state, columns);
    default: return { rows: [] };
  }
}
