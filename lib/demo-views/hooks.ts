import { AGENT_TICK, CHECK_TICK, EDIT_TICK, READ_TICK, REPLY_TICK, SIMULATION_TICK_MS, MUSIC_DURATION_SECONDS, WORK_TICKS } from "../demo-config.ts";
import { actionRow, bar, color, fitText, plainRow, stripAnsi, terminalCellWidth, wrapTerminalText } from "../demo-render.ts";
import { getHeldCommandFixture, mermaidReplyFixture } from "../demo-fixtures.ts";
import { getMarkdownFixture, markdownShowsBefore, selectedMarkdownPath } from "../demo-markdown.ts";
import type { DemoButton, DemoDefinition, DemoPanel, DemoRow, SimulationState, CompletedTurn } from "../demo-types.ts";

const WARNING_PERCENT = 80;
const QUOTA_YELLOW_PERCENT = 50;
const BLAST_TIMEOUT_SECONDS = 60;
const BLAST_DELETE_FILES = ["dist/index.html", "dist/app.js", "dist/styles.css", "dist/chunk-1.js", "dist/chunk-2.js"];
const MAX_LEDGER_ROWS = 40;
const QUOTA_INITIAL_FIVE_HOUR = 42;
const QUOTA_INITIAL_SEVEN_DAY = 18;
const QUOTA_FIVE_HOUR_RESET_SECONDS = 13_320;
const QUOTA_SEVEN_DAY_RESET_SECONDS = 374_400;
const QUOTA_FIVE_HOUR_BURN_SECONDS = 900;
const QUOTA_SEVEN_DAY_BURN_SECONDS = 30_240;
const QUOTA_STATUS_WIDTH = 80;
const MAX_QUOTA_SAMPLES = 240;
const QUOTA_RESET_DROP = 0.5;
const LEDGER_STATUS_WIDTH = 78;
const LEDGER_MODEL = "sonnet-4-5";
const MUSIC_BAR_WIDTH = 12;
const MISSION_BAND_SECONDS = 30;
const MERMAID_COLORED_MARGIN = 3;
const MERMAID_PLAIN_MARGIN = 6;
const MERMAID_HORIZONTAL_WIDTH = 39;
const QUEUE_CONTROL_WIDTH = 34;
const QUEUE_GAP_MS = 5200;
const LYRIC_LEAD_SECONDS = 0.3;
const STEERING_LABEL = "waiting for the next tool call";
const BUDGET_FIVE_HOUR_LIMIT = 90;
const BUDGET_SEVEN_DAY_LIMIT = 95;
const MISSION_MAX_GRAPHIC_HEIGHT = 18;
const MARKDOWN_GRAPHIC_HEIGHT = 10;
const MARKDOWN_HEADING_MINIMUM_RULE = 8;
const MARKDOWN_HEADING = /^(#{1,6})\s+(.*)$/;
const DIM = "2";
const GREEN = "32";
const YELLOW = "33";
const RED = "31";
const CYAN = "36";
const MUSIC_GREEN = "38;2;29;185;84";

export const HOOK_DEMOS: DemoDefinition[] = [
  {
    id: "quota-meter", placement: "under-prompt", startupCommand: "", startsOpen: false, initialTab: "Quota",
    example: "Review the project and suggest a small improvement.",
    instructions: "/quota opens the detail pane. Plan limits are sampled on startup, after replies, and every 60 seconds.",
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
    id: "budget-guard", placement: "gate", startupCommand: "", startsOpen: false, initialTab: "Budget",
    example: "Inspect the project, make the change, and run the tests.",
    instructions: "Use /guard cost 0.02 to try a cost cap. /guard 5h 90 and /guard 7d 95 set plan limits; /guard override allows one turn.",
    limitation: "Costs and plan windows are local fixtures. Native defaults guard 90% of the 5-hour window and 95% of the 7-day window; the cost guard starts disabled.",
    source: "https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/budget-guard/hooks/register.tsx",
    controls: [{ label: "Set $0.02 cap", action: { type: "budget", dollars: 0.02 } }, { label: "Raise to $0.20", action: { type: "budget", dollars: 0.2 } }],
  },
  {
    id: "mermaid-draw", placement: "transcript", startupCommand: "", startsOpen: true, initialTab: "Color",
    example: "Draw a Mermaid diagram of the request, worker, and reply flow.",
    instructions: "Ask for a diagram. A completed Mermaid fence becomes terminal art. /mermaid ascii toggles characters; color toggles color; lr controls sideways layout.",
    limitation: "The reply is a local flowchart fixture. Its Unicode and ASCII geometry and role colors are taken from the upstream renderer output for this graph.",
    source: "https://github.com/galElmalah/claude-mods/blob/f7e8416f994738293cb39fea75cc9f0ba387e91a/claude-mermaid/hooks/register.ts",
    controls: [{ label: "Toggle ASCII", action: { type: "ascii-toggle" } }, { label: "Plain", action: { type: "tab", value: "Plain" } }, { label: "Color", action: { type: "tab", value: "Color" } }, { label: "Toggle direction", action: { type: "orientation-toggle" } }],
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
    id: "mission-control", placement: "right-pane", startupCommand: "", startsOpen: false, initialTab: "Who",
    example: "Review the app, delegate a test check, and update the documentation.",
    instructions: "/mission opens Who; /mission code opens the file map. Agent and tool events fill the tree; its summary stays briefly after the turn.",
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
    instructions: "/md README.md opens the existing file. A successful Markdown edit adds a notification; /md opens its preview. Compare Before and After, step between files, and switch Page or Text.",
    limitation: "Markdown files and snapshots are local fixtures. Page, Text, Before, Render and Browser use these fixtures; no repository or GitHub rendering request is made.",
    source: "https://github.com/hamzafer/claude-code-mods/blob/11abba8c305b0d7563e1c89254c6d5e708746b47/mods/md-preview/hooks/register.tsx",
    controls: [{ label: "Open latest (/md)", action: { type: "open" } }, { label: "Previous file", key: "p", action: { type: "navigate", delta: -1 } }, { label: "Next file", key: "n", action: { type: "navigate", delta: 1 } }, { label: "Toggle Page / Text", key: "t", action: { type: "render-toggle" } }, { label: "Render", key: "r", action: { type: "md-refresh" } }, { label: "Browser", key: "o", action: { type: "md-browser" } }, { label: "Close", key: "q", action: { type: "close" } }],
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

function prefixedActionRow(prefix: string, buttons: DemoButton[]): DemoRow {
  const controls = actionRow(buttons);
  const offset = terminalCellWidth(prefix);
  return { text: prefix + controls.text, targets: controls.targets.map(target => ({ ...target, column: target.column + offset })) };
}

function adjacentActionRow(prefix: string, buttons: DemoButton[]): DemoRow {
  const row: DemoRow = { text: prefix, targets: [] };
  let column = terminalCellWidth(prefix) + 1;
  for (const button of buttons) {
    const label = `[ ${button.label} ]`;
    const width = terminalCellWidth(label);
    row.text += color(label, DIM);
    const target: DemoRow["targets"][number] = { column, width, action: button.action };
    if (button.key !== undefined) target.key = button.key;
    row.targets.push(target);
    column += width;
  }
  return row;
}

function compactText(text: string, columns: number): string {
  if (terminalCellWidth(text) <= columns) return text;
  return stripAnsi(fitText(text, Math.max(0, columns - 1))) + "…";
}

function quotaDuration(seconds: number): string {
  const minutes = Math.max(0, Math.round(seconds / 60));
  const hours = Math.floor(minutes / 60);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h${String(minutes % 60).padStart(2, "0")}m`;
  return `${minutes}m`;
}

function quotaColor(percent: number): string {
  if (percent >= WARNING_PERCENT) return RED;
  if (percent >= QUOTA_YELLOW_PERCENT) return YELLOW;
  return GREEN;
}

type QuotaWindow = { title: string; short: string; percent: number; resetSeconds: number; resetClock: string; burnSeconds: number };
type QuotaSample = { seconds: number; percent: number };
type QuotaReading = { window: QuotaWindow; secondsLeft: number; burn: number | null; fullSeconds: number | null; spanSeconds: number };

function quotaSamples(state: SimulationState, field: "fiveHour" | "sevenDay", initial: number, windowSeconds: number): QuotaSample[] {
  const elapsedSeconds = state.clockTick * SIMULATION_TICK_MS / 1000;
  const historySeconds = (MAX_QUOTA_SAMPLES + state.completed.length) * 60;
  const startSeconds = Math.max(0, Math.floor((elapsedSeconds - historySeconds) / 60) * 60);
  const completions: QuotaSample[] = [];
  for (const turn of state.completed) {
    let seconds = Math.min(elapsedSeconds, turn.turn * WORK_TICKS * SIMULATION_TICK_MS / 1000);
    if (turn.completedAtTick !== undefined) seconds = turn.completedAtTick * SIMULATION_TICK_MS / 1000;
    if (seconds <= elapsedSeconds) completions.push({ seconds, percent: Math.round(turn.usage[field]) });
  }
  completions.sort((first, second) => first.seconds - second.seconds);
  const events = completions.filter(sample => sample.seconds >= startSeconds);
  let completionIndex = 0;
  let percent = initial;
  for (let seconds = startSeconds; seconds <= elapsedSeconds; seconds += 60) {
    while (completionIndex < completions.length && completions[completionIndex].seconds <= seconds) {
      percent = completions[completionIndex].percent;
      completionIndex += 1;
    }
    events.push({ seconds, percent });
  }
  events.sort((first, second) => first.seconds - second.seconds);
  let samples: QuotaSample[] = [];
  for (const sample of events) {
    const last = samples.at(-1);
    if (last && sample.percent < last.percent - QUOTA_RESET_DROP) samples = [];
    samples = samples.filter(kept => kept.seconds >= sample.seconds - windowSeconds && kept.seconds < sample.seconds);
    samples.push(sample);
    if (samples.length > MAX_QUOTA_SAMPLES) samples = samples.slice(-MAX_QUOTA_SAMPLES);
  }
  return samples;
}

function quotaReading(window: QuotaWindow, elapsedSeconds: number, samples: QuotaSample[]): QuotaReading {
  let burn: number | null = null;
  const first = samples[0];
  const last = samples.at(-1);
  let spanSeconds = 0;
  if (first && last) {
    spanSeconds = last.seconds - first.seconds;
    if (samples.length >= 2 && spanSeconds >= window.burnSeconds) burn = (last.percent - first.percent) / (spanSeconds / 3600);
  }
  let fullSeconds: number | null = null;
  if (burn !== null && burn > 0) fullSeconds = Math.max(0, (100 - window.percent) / burn * 3600);
  return { window, secondsLeft: Math.max(0, window.resetSeconds - elapsedSeconds), burn, fullSeconds, spanSeconds };
}

function quotaRows(reading: QuotaReading, columns: number): DemoRow[] {
  const window = reading.window;
  let burnText = `burn rate: collecting (needs samples over ${quotaDuration(window.burnSeconds)})`;
  let projection = "projection: collecting";
  if (reading.burn !== null) {
    burnText = `burn ${reading.burn.toFixed(1)}%/h over the last ${quotaDuration(reading.spanSeconds)}`;
    if (reading.fullSeconds === null) projection = "projection: steady, not rising";
    else if (reading.fullSeconds >= reading.secondsLeft) projection = "projection: resets first";
    else projection = `projection: 100% in ~${quotaDuration(reading.fullSeconds)}`;
  }
  return [
    plainRow(" " + color(`${window.title} · ${window.percent}% used`, "1")),
    plainRow(" " + color(bar(window.percent, Math.max(8, columns - 2)), quotaColor(window.percent))),
    plainRow(" " + color(`resets ${window.resetClock}, in ${quotaDuration(reading.secondsLeft)}`, DIM)),
    plainRow(" " + color(burnText, DIM)),
    plainRow(" " + color(projection, DIM)),
    plainRow(""),
  ];
}

function quotaStatus(readings: QuotaReading[]): string {
  const parts: string[] = [];
  let soonest: QuotaReading | null = null;
  let allCollecting = true;
  for (const [index, reading] of readings.entries()) {
    let label = `${reading.window.short} ${reading.window.percent}%`;
    if (index === 0) label += ` (resets ${quotaDuration(reading.secondsLeft)})`;
    parts.push(label);
    if (reading.burn !== null) allCollecting = false;
    if (reading.fullSeconds === null || reading.fullSeconds >= reading.secondsLeft) continue;
    if (soonest === null || reading.fullSeconds < (soonest.fullSeconds ?? Infinity)) soonest = reading;
  }
  let tail = "nothing hits 100% before reset";
  if (allCollecting) tail = "collecting burn rate";
  if (soonest !== null) tail = `${soonest.window.short} full in ~${quotaDuration(soonest.fullSeconds ?? 0)}`;
  const status = [...parts, tail].join(" · ");
  if (status.length <= QUOTA_STATUS_WIDTH) return status;
  return compactText(parts.join(" · "), QUOTA_STATUS_WIDTH);
}

function renderQuota(state: SimulationState, columns: number): DemoPanel {
  const sample = state.completed.at(-1)?.usage ?? state.usage;
  if (state.completed.length === 0 && sample.fiveHour === 0 && sample.sevenDay === 0) {
    const status = "quota-meter: no plan limits reported yet";
    if (!state.panel.open) return { rows: [], status };
    return { status, rows: fitRows([
      plainRow(" " + color("Quota", "1")),
      plainRow(" " + color("No plan limits reported yet.", DIM)),
      plainRow(" " + color("Subscription sessions report them once Claude has answered; API-key sessions never do.", DIM)),
    ], columns) };
  }
  const elapsedSeconds = Math.floor(state.clockTick * SIMULATION_TICK_MS / 60_000) * 60;
  const readings = [
    quotaReading({ title: "5-hour limit", short: "5h", percent: Math.round(sample.fiveHour), resetSeconds: QUOTA_FIVE_HOUR_RESET_SECONDS, resetClock: "12:42", burnSeconds: QUOTA_FIVE_HOUR_BURN_SECONDS }, elapsedSeconds, quotaSamples(state, "fiveHour", QUOTA_INITIAL_FIVE_HOUR, 5 * 3600)),
    quotaReading({ title: "7-day limit", short: "7d", percent: Math.round(sample.sevenDay), resetSeconds: QUOTA_SEVEN_DAY_RESET_SECONDS, resetClock: "Fri 17:00", burnSeconds: QUOTA_SEVEN_DAY_BURN_SECONDS }, elapsedSeconds, quotaSamples(state, "sevenDay", QUOTA_INITIAL_SEVEN_DAY, 7 * 24 * 3600)),
  ];
  const status = `quota-meter: ${quotaStatus(readings)}`;
  if (!state.panel.open) return { rows: [], status };
  const rows: DemoRow[] = [];
  for (const reading of readings) rows.push(...quotaRows(reading, columns));
  rows.push(plainRow(" " + color("Sampled after each turn and every 60s. /quota closes this pane.", DIM)));
  return { rows: fitRows(rows, columns), status };
}

function ledgerMoney(dollars: number): string {
  if (dollars >= 1) return `$${dollars.toFixed(2)}`;
  return `$${dollars.toFixed(4)}`;
}

function ledgerTokens(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "-";
  if (value < 1000) return String(Math.round(value));
  if (value < 10_000) return `${(value / 1000).toFixed(1)}k`;
  if (value < 1_000_000) return `${Math.round(value / 1000)}k`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

function elapsedTime(milliseconds: number): string {
  const seconds = milliseconds / 1000;
  if (seconds < 10) return `${seconds.toFixed(1)}s`;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m${String(Math.round(seconds % 60)).padStart(2, "0")}s`;
}

function cachePercent(input: number, cached: number, written: number): string {
  const totalInput = input + cached + written;
  if (totalInput === 0) return "-";
  return `${Math.round(cached / totalInput * 100)}%`;
}

function turnCostDelta(state: SimulationState, turnIndex: number): number {
  const recordedDelta = state.completed[turnIndex]?.costDelta;
  if (recordedDelta !== undefined) return Math.max(0, recordedDelta);
  const previousTotal = state.completed[turnIndex - 1]?.usage.cost ?? 0;
  const currentTotal = state.completed[turnIndex]?.usage.cost ?? previousTotal;
  return Math.max(0, currentTotal - previousTotal);
}

type LedgerRow = { number: string; model: string; input: number; output: number; cached: number; written: number; duration: number; cost: number; subagent: boolean };
type LedgerColumn = { key: string; heading: string; priority: number; left: boolean; cells: string[]; total: string; width: number };

function ledgerRow(state: SimulationState, turn: CompletedTurn, index: number): LedgerRow {
  const subagent = turn.subagent === true;
  return {
    number: String(turn.turn) + (subagent ? "*" : ""),
    model: turn.model ?? LEDGER_MODEL,
    input: turn.usage.input, output: turn.usage.output, cached: turn.usage.cached,
    written: turn.cacheWrite ?? 0, duration: turn.durationMs ?? WORK_TICKS * SIMULATION_TICK_MS,
    cost: turnCostDelta(state, index), subagent,
  };
}

function ledgerTotals(rows: LedgerRow[]): LedgerRow {
  const totals: LedgerRow = { number: "all", model: "", input: 0, output: 0, cached: 0, written: 0, duration: 0, cost: 0, subagent: false };
  for (const row of rows) {
    totals.input += row.input; totals.output += row.output; totals.cached += row.cached;
    totals.written += row.written; totals.duration += row.duration; totals.cost += row.cost;
  }
  return totals;
}

function ledgerColumn(key: string, heading: string, priority: number, left: boolean, shown: LedgerRow[], total: LedgerRow, format: (row: LedgerRow) => string): LedgerColumn {
  const cells = shown.map(format);
  const totalText = format(total);
  const width = Math.max(heading.length, totalText.length, ...cells.map(cell => cell.length), 1);
  return { key, heading, priority, left, cells, total: totalText, width };
}

function ledgerColumns(rows: LedgerRow[], shown: LedgerRow[], columns: number): LedgerColumn[] {
  const total = ledgerTotals(rows);
  const available = [
    ledgerColumn("number", "#", 3, false, shown, total, row => row.number),
    ledgerColumn("model", "model", 4, true, shown, total, row => row.model),
    ledgerColumn("input", "in", 9, false, shown, total, row => ledgerTokens(row.input)),
    ledgerColumn("output", "out", 8, false, shown, total, row => ledgerTokens(row.output)),
    ledgerColumn("cached", "cache r", 6, false, shown, total, row => ledgerTokens(row.cached)),
    ledgerColumn("written", "cache w", 2, false, shown, total, row => ledgerTokens(row.written)),
    ledgerColumn("hit", "hit", 5, false, shown, total, row => cachePercent(row.input, row.cached, row.written)),
    ledgerColumn("duration", "time", 1, false, shown, total, row => elapsedTime(row.duration)),
    ledgerColumn("cost", "cost", 10, false, shown, total, row => ledgerMoney(row.cost)),
  ];
  let kept = [...available];
  const leastImportant = [...available].sort((first, second) => first.priority - second.priority);
  for (const candidate of leastImportant) {
    let width = Math.max(0, kept.length - 1);
    for (const column of kept) width += column.width;
    if (width <= columns || kept.length <= 1) break;
    kept = kept.filter(column => column.key !== candidate.key);
  }
  return kept;
}

function ledgerLine(columns: LedgerColumn[], value: (column: LedgerColumn) => string): string {
  const parts: string[] = [];
  for (const column of columns) {
    const text = value(column);
    parts.push(column.left ? text.padEnd(column.width) : text.padStart(column.width));
  }
  return parts.join(" ");
}

function renderLedger(state: SimulationState, columns: number): DemoPanel {
  const latest = state.completed.at(-1);
  if (!latest) {
    const status = `token-ledger: ${ledgerMoney(state.usage.cost)} session · no turns yet - /ledger`;
    if (!state.panel.open) return { rows: [], status };
    return { rows: fitRows([plainRow(color("No turns yet. Send a prompt and the first row lands here.", DIM))], columns), status };
  }
  const allRows = state.completed.map((turn, index) => ledgerRow(state, turn, index));
  const newest = allRows.at(-1) as LedgerRow;
  const statusText = `${ledgerMoney(latest.usage.cost)} session · last turn ${ledgerMoney(newest.cost)} · ${ledgerTokens(newest.input + newest.cached + newest.written)} in / ${ledgerTokens(newest.output)} out · cache ${cachePercent(newest.input, newest.cached, newest.written)}`;
  const status = `token-ledger: ${compactText(statusText, LEDGER_STATUS_WIDTH)}`;
  if (!state.panel.open) return { rows: [], status };
  const shown = allRows.slice(-MAX_LEDGER_ROWS).reverse();
  const laidColumns = ledgerColumns(allRows, shown, columns);
  const heading = ledgerLine(laidColumns, column => column.heading);
  const rows: DemoRow[] = [plainRow(color(heading, "1"))];
  for (const [index, row] of shown.entries()) {
    const line = ledgerLine(laidColumns, column => column.cells[index] ?? "");
    rows.push(plainRow(row.subagent ? color(line, DIM) : line));
  }
  rows.push(plainRow(color("-".repeat(Math.min(columns, heading.length)), DIM)));
  rows.push(plainRow(color(ledgerLine(laidColumns, column => column.total), "1")));
  const notes = [`session total ${ledgerMoney(latest.usage.cost)}`];
  const hidden = allRows.length - shown.length;
  if (hidden > 0) notes.push(`${hidden} older in the totals`);
  if (shown.some(row => row.subagent)) notes.push("* subagent turn");
  rows.push(plainRow(color(notes.join(" · "), DIM)));
  return { rows: fitRows(rows, columns), status };
}

type BudgetFigure = { label: string; short: string; value: number; limit: number; valueText: string; limitText: string; percent: number };

function budgetFigures(state: SimulationState): BudgetFigure[] {
  const figures: BudgetFigure[] = [];
  if (state.budget.dollars > 0) {
    figures.push({ label: "Session cost", short: "cost", value: state.usage.cost, limit: state.budget.dollars, valueText: `$${state.usage.cost.toFixed(2)}`, limitText: `$${state.budget.dollars.toFixed(2)}`, percent: Math.round(state.usage.cost / state.budget.dollars * 100) });
  }
  const fiveHourLimit = state.budget.fiveHourLimit ?? BUDGET_FIVE_HOUR_LIMIT;
  if (fiveHourLimit > 0) figures.push({ label: "5-hour window", short: "5h", value: state.usage.fiveHour, limit: fiveHourLimit, valueText: `${state.usage.fiveHour}%`, limitText: `${fiveHourLimit}%`, percent: Math.round(state.usage.fiveHour / fiveHourLimit * 100) });
  const sevenDayLimit = state.budget.sevenDayLimit ?? BUDGET_SEVEN_DAY_LIMIT;
  if (sevenDayLimit > 0) figures.push({ label: "7-day window", short: "7d", value: state.usage.sevenDay, limit: sevenDayLimit, valueText: `${state.usage.sevenDay}%`, limitText: `${sevenDayLimit}%`, percent: Math.round(state.usage.sevenDay / sevenDayLimit * 100) });
  return figures;
}

function budgetStatus(figures: BudgetFigure[], warningPercent: number): string | undefined {
  if (!figures.some(figure => figure.percent >= warningPercent)) return undefined;
  const parts: string[] = [];
  for (const figure of figures) {
    if (figure.short === "cost") parts.push(`cost ${figure.valueText}/${figure.limitText} ${figure.percent}%`);
    else parts.push(`${figure.short} ${figure.value}/${figure.limit}%`);
  }
  if (figures.some(figure => figure.value >= figure.limit)) return parts.join(" · ") + " · over limit";
  return parts.join(" · ");
}

function renderBudget(state: SimulationState, columns: number): DemoPanel {
  if (!state.budget.enabled) return { rows: [] };
  const figures = budgetFigures(state);
  const text = budgetStatus(figures, state.budget.warnAt ?? WARNING_PERCENT);
  const status = text ? `budget-guard: ${text}` : undefined;
  if (state.decision !== "budget") return { rows: [], status };
  const figure = figures.find(candidate => candidate.value >= candidate.limit);
  if (!figure) return { rows: [], status };
  const rows = [plainRow(color("Budget", "1"))];
  const question = `${figure.label} is ${figure.valueText}, past its ${figure.limitText} limit. Send this prompt anyway?`;
  for (const line of wrapTerminalText(question, columns)) rows.push(plainRow(line));
  rows.push(actionRow([{ label: "Send anyway", action: { type: "override" } }, { label: "Do not send", action: { type: "deny" } }]));
  return { rows: fitRows(rows, columns), status };
}

function mermaidFence(isComplete: boolean): DemoRow[] {
  const rows = [plainRow("```mermaid"), plainRow("graph TD"), plainRow("  Request --> Plan --> Result")];
  if (isComplete) rows.push(plainRow("```"));
  return rows;
}

function mermaidBorder(text: string, colored: boolean): string {
  return colored ? color(text, CYAN) : text;
}

function mermaidArrow(text: string, colored: boolean): string {
  return colored ? color(text, YELLOW) : text;
}

function mermaidLine(text: string, colored: boolean): string {
  return colored ? color(text, DIM) : text;
}

function horizontalMermaid(ascii: boolean, colored: boolean): string[] {
  const top = ascii ? ["+---------+", "+------+", "+--------+"] : ["┌─────────┐", "┌──────┐", "┌────────┐"];
  const bottom = ascii ? top : ["└─────────┘", "└──────┘", "└────────┘"];
  const wall = mermaidBorder(ascii ? "|" : "│", colored);
  const junction = mermaidBorder(ascii ? "|" : "├", colored);
  const edge = mermaidLine(ascii ? "----" : "────", colored) + mermaidArrow(ascii ? ">" : "►", colored);
  const empty = `${wall}         ${wall}     ${wall}      ${wall}     ${wall}        ${wall}`;
  return [
    top.map(border => mermaidBorder(border, colored)).join("     "),
    empty,
    `${wall} Request ${junction}${edge}${wall} Plan ${junction}${edge}${wall} Result ${wall}`,
    empty,
    bottom.map(border => mermaidBorder(border, colored)).join("     "),
  ];
}

function verticalMermaid(ascii: boolean, colored: boolean): string[] {
  const top = mermaidBorder(ascii ? "+---------+" : "┌─────────┐", colored);
  const bottom = mermaidBorder(ascii ? "+---------+" : "└─────────┘", colored);
  const joining = mermaidBorder(ascii ? "+---------+" : "└────┬────┘", colored);
  const wall = mermaidBorder(ascii ? "|" : "│", colored);
  const connector = "     " + mermaidLine(ascii ? "|" : "│", colored);
  const arrow = "     " + mermaidArrow(ascii ? "v" : "▼", colored);
  const blank = `${wall}         ${wall}`;
  return [
    top, blank, `${wall} Request ${wall}`, blank, joining,
    connector, connector, connector, connector, arrow,
    top, blank, `${wall}   Plan  ${wall}`, blank, joining,
    connector, connector, connector, connector, arrow,
    top, blank, `${wall}  Result ${wall}`, blank, bottom,
  ];
}

function isSupportedMermaidGraph(graph: string): boolean {
  return graph.trim().replace(/\s+/g, " ") === "graph TD Request --> Plan --> Result";
}

export function renderMermaidTranscriptEntry(text: string, state: SimulationState, columns: number): DemoRow[] {
  const fence = /```mermaid\s*\n([\s\S]*?)\n```/.exec(text);
  if (!fence || !isSupportedMermaidGraph(fence[1])) {
    return wrapTerminalText(text, columns - 2).map((line, index) => plainRow((index === 0 ? "⏺ " : "  ") + line));
  }
  const colored = state.panel.tab !== "Plain";
  const margin = colored ? MERMAID_COLORED_MARGIN : MERMAID_PLAIN_MARGIN;
  const room = Math.max(1, columns - margin);
  const vertical = state.panel.vertical || MERMAID_HORIZONTAL_WIDTH > room;
  const lines = vertical ? verticalMermaid(state.panel.ascii === true, colored) : horizontalMermaid(state.panel.ascii === true, colored);
  const rows: DemoRow[] = [];
  const before = text.slice(0, fence.index).trim();
  for (const [index, line] of wrapTerminalText(before, columns - 2).entries()) rows.push(plainRow((index === 0 ? "⏺ " : "  ") + line));
  rows.push(plainRow(""));
  for (const line of lines) rows.push(plainRow("  " + line));
  const after = text.slice(fence.index + fence[0].length).trim();
  if (after) rows.push(...wrapTerminalText(after, columns - 2).map(line => plainRow("  " + line)));
  return fitRows(rows, columns);
}

function renderMermaid(state: SimulationState, columns: number): DemoPanel {
  if (!/diagram|flow|architecture|sequence|graph/i.test(state.prompt)) return { rows: [] };
  if (state.phase === "idle" || state.tick < REPLY_TICK) return { rows: [] };
  if (state.phase !== "complete") return { rows: fitRows(mermaidFence(false), columns) };
  const reply = state.transcript.findLast(entry => entry.role === "assistant" && entry.turn === state.turn)?.text ?? mermaidReplyFixture(state.prompt);
  return { rows: renderMermaidTranscriptEntry(reply, state, columns) };
}

function queueStateLabel(state: SimulationState): string {
  if (state.steering.length > 0 && state.phase === "working") return "going into the turn";
  if (state.queue.length === 0) return "nothing held";
  if (state.phase === "working" || state.phase === "decision") return "sent when the turn ends";
  const secondsSinceDispatch = (state.clockTick - state.lastQueueDispatchTick) * SIMULATION_TICK_MS;
  if (secondsSinceDispatch < QUEUE_GAP_MS) return "going out";
  return "sending";
}

function queueButtons(index: number, count: number): DemoRow {
  let text = "";
  const targets: DemoRow["targets"] = [];
  const up = index > 0 ? actionRow([{ label: "↑", action: { type: "queue-up", index } }]) : plainRow("     ");
  const down = index < count - 1 ? actionRow([{ label: "↓", action: { type: "queue-down", index } }]) : plainRow("     ");
  const main = actionRow([{ label: "▶", action: { type: "queue-now", index } }, { label: "edit", action: { type: "queue-edit", index } }, { label: "✕", action: { type: "queue-remove", index } }]);
  for (const part of [up, down, main]) {
    if (text) text += " ";
    const offset = terminalCellWidth(text);
    for (const target of part.targets) targets.push({ ...target, column: target.column + offset });
    text += part.text;
  }
  return { text, targets };
}

function framedRow(row: DemoRow, width: number): DemoRow {
  const content = fitText(row.text, width);
  const padding = " ".repeat(Math.max(0, width - terminalCellWidth(content)));
  return { text: color("│", DIM) + content + padding + color("│", DIM), targets: row.targets.map(target => ({ ...target, column: target.column + 1 })) };
}

function queueEntryRows(prompt: string, index: number, count: number, width: number): DemoRow[] {
  const controls = queueButtons(index, count);
  const gutter = String(count).length + 1;
  const room = Math.max(8, width - gutter - QUEUE_CONTROL_WIDTH);
  const firstLine = prompt.trim().split("\n")[0]?.trim() ?? "";
  const prefix = color(String(index + 1).padStart(gutter - 1), DIM) + " " + compactText(firstLine, room).padEnd(room) + " ";
  if (terminalCellWidth(prefix + controls.text) <= width) {
    const offset = terminalCellWidth(prefix);
    return [{ text: prefix + controls.text, targets: controls.targets.map(target => ({ ...target, column: target.column + offset })) }];
  }
  return [plainRow(color(`${index + 1} `, DIM) + compactText(firstLine, width - gutter)), controls];
}

function renderQueue(state: SimulationState, columns: number): DemoPanel {
  const count = state.queue.length + state.steering.length;
  if (count === 0) return { rows: [] };
  const width = Math.max(8, columns - 2);
  const rows: DemoRow[] = [plainRow(color(`╭${"─".repeat(width)}╮`, DIM))];
  const label = queueStateLabel(state);
  let labelColor = DIM;
  if (label === "going into the turn" || label === "going out" || label === "sending") labelColor = CYAN;
  rows.push(framedRow(plainRow(color("queued · ", DIM) + color(String(count), "1") + color(" · ", DIM) + color(label, labelColor)), width));
  for (const [index, prompt] of state.steering.entries()) {
    const button = [{ label: "✕", action: { type: "queue-unsteer" as const, index } }];
    const suffixWidth = terminalCellWidth(actionRow(button).text) + STEERING_LABEL.length + 2;
    const textRoom = Math.max(8, width - suffixWidth - 2);
    const prefix = color("▶ ", CYAN) + compactText(prompt, textRoom).padEnd(textRoom) + " " + color(STEERING_LABEL, DIM) + " ";
    const steering = prefixedActionRow(prefix, button);
    if (terminalCellWidth(steering.text) <= width) rows.push(framedRow(steering, width));
    else {
      rows.push(framedRow(plainRow(color("▶ ", CYAN) + compactText(prompt, width - 2)), width));
      rows.push(framedRow(prefixedActionRow(color(compactText(STEERING_LABEL, width - 7), DIM) + " ", button), width));
    }
  }
  for (const [index, prompt] of state.queue.entries()) {
    for (const row of queueEntryRows(prompt, index, state.queue.length, width)) rows.push(framedRow(row, width));
  }
  const buttons: DemoButton[] = [];
  if (state.phase !== "working" && state.phase !== "decision") buttons.push({ label: "send", action: { type: "queue-send" } });
  buttons.push({ label: "clear", action: { type: "queue-clear" } });
  rows.push(framedRow(actionRow(buttons), width));
  rows.push(plainRow(color(`╰${"─".repeat(width)}╯`, DIM)));
  return { rows: fitRows(rows, columns) };
}

function missionControls(): DemoRow {
  return actionRow([{ label: "Who", key: "w", action: { type: "tab", value: "Who" } }, { label: "Code", key: "c", action: { type: "tab", value: "Code" } }, { label: "Close", key: "q", action: { type: "close" } }]);
}

function missionToolCount(state: SimulationState): number {
  let count = 0;
  if (state.tick >= READ_TICK) count += 1;
  if (state.tick >= AGENT_TICK) count += 1;
  if (state.tick >= EDIT_TICK) count += 1;
  if (state.tick >= CHECK_TICK) count += 1;
  return count;
}

function missionAgentRunning(state: SimulationState): boolean {
  return state.tick >= AGENT_TICK && state.tick < REPLY_TICK && state.phase === "working";
}

function missionRow(prefix: string, text: string, running: boolean, failed = false, isTool = true): DemoRow {
  let code = DIM;
  if (!isTool) code = `1;${GREEN}`;
  if (running) code = YELLOW;
  if (failed) code = RED;
  return plainRow(color(prefix, DIM) + color(text, code));
}

function missionDuration(state: SimulationState, startTick: number, endTick: number): string {
  const tick = Math.min(state.tick, endTick);
  return elapsedTime(Math.max(0, tick - startTick) * SIMULATION_TICK_MS);
}

function renderMissionWho(state: SimulationState, columns: number): DemoPanel {
  const agentCount = state.tick >= AGENT_TICK ? 1 : 0;
  const runningCount = missionAgentRunning(state) ? 1 : 0;
  const rows = [missionControls(), plainRow(color(`${agentCount} agents (${runningCount} running) · ${missionToolCount(state)} tool calls`, DIM))];
  if (state.turn === 0) {
    rows.push(plainRow(color("Nothing yet. Start a task and watch it fill in.", DIM)));
    return { rows: fitRows(rows, columns) };
  }
  const running = state.phase === "working" || state.phase === "decision";
  const failed = state.phase === "stopped";
  rows.push(missionRow("", `◆ main · ${compactText(state.prompt, 50)}  ${missionDuration(state, 0, WORK_TICKS)}`, running, failed, false));
  if (state.tick >= READ_TICK) rows.push(missionRow(state.tick >= AGENT_TICK ? "├─ " : "└─ ", `◉ read: src/app.ts  ${missionDuration(state, READ_TICK, AGENT_TICK)}`, running && state.tick < AGENT_TICK));
  if (state.tick >= AGENT_TICK) {
    const branch = state.tick >= EDIT_TICK ? "├─ " : "└─ ";
    rows.push(missionRow(branch, `● test reviewer  ${missionDuration(state, AGENT_TICK, REPLY_TICK)} · 1 tools`, missionAgentRunning(state), failed, false));
    rows.push(missionRow(state.tick >= EDIT_TICK ? "│  └─ " : "   └─ ", `◉ read: tests/app.test.ts  ${missionDuration(state, AGENT_TICK, EDIT_TICK)}`, running && state.tick < EDIT_TICK));
  }
  if (state.tick >= EDIT_TICK) rows.push(missionRow(state.tick >= CHECK_TICK ? "├─ " : "└─ ", `✎ edit: src/app.ts  ${missionDuration(state, EDIT_TICK, CHECK_TICK)}`, running && state.tick < CHECK_TICK));
  if (state.tick >= CHECK_TICK) rows.push(missionRow("└─ ", `$ bash: npm test  ${missionDuration(state, CHECK_TICK, REPLY_TICK)}`, running && state.tick < REPLY_TICK));
  return { rows: fitRows(rows, columns) };
}

function blankRows(count: number): DemoRow[] {
  return Array.from({ length: count }, () => plainRow(""));
}

function renderMissionCode(state: SimulationState, columns: number): DemoPanel {
  const graphicHeight = Math.max(1, Math.min(MISSION_MAX_GRAPHIC_HEIGHT, Math.round(columns * 0.3)));
  const rows: DemoRow[] = [missionControls(), ...blankRows(graphicHeight)];
  return { rows: fitRows(rows, columns), graphic: "files", graphicOffset: 1, graphicHeight };
}

function missionBand(state: SimulationState, columns: number): DemoRow[] {
  const toolCount = missionToolCount(state);
  if (state.turn === 0 || toolCount === 0) return [];
  const completed = state.completed.findLast(turn => turn.turn === state.turn);
  const endedAtTick = state.stoppedAtTick ?? completed?.completedAtTick ?? state.tick;
  const secondsAfterTurn = (state.clockTick - endedAtTick) * SIMULATION_TICK_MS / 1000;
  if (state.phase !== "working" && state.phase !== "decision" && secondsAfterTurn >= MISSION_BAND_SECONDS) return [];
  const parts: string[] = [];
  if (state.tick >= AGENT_TICK) parts.push(`${missionAgentRunning(state) ? 1 : 0}/1 agents`);
  parts.push(`${toolCount} tools`);
  if (state.tick >= EDIT_TICK) parts.push("1 files changed");
  return fitRows([plainRow(color(" ◈ mission: ", `1;34`) + parts.join(" · ") + color("  ·  /mission", DIM))], columns);
}

function renderMission(state: SimulationState, columns: number): DemoPanel {
  const bandRows = missionBand(state, columns);
  if (!state.panel.open) return { rows: [], bandRows };
  const pane = state.panel.tab === "Code" ? renderMissionCode(state, columns) : renderMissionWho(state, columns);
  return { ...pane, bandRows };
}

type BlastReport = { label: string; summary: string; details: string[] };

function blastReport(command: string): BlastReport {
  if (command.startsWith("git push")) return { label: "Force push", summary: "overwrite the remote branch: 2 remote commits lost, 3 pushed (as of the last fetch)", details: ["lost   a31c402 remove old handler", "lost   d7e9851 old documentation", "pushed b8f4902 improve the handler", "pushed c6a3271 add focused tests", "pushed e2d1503 document the change"] };
  if (command.startsWith("rm ")) return { label: "Deletes files", summary: `delete ${BLAST_DELETE_FILES.length} files (240 KB)`, details: BLAST_DELETE_FILES };
  return { label: "Database migration", summary: "change the database schema (not previewable here)", details: ["uncommitted M prisma/schema.prisma", "uncommitted ?? prisma/migrations/add_demo/migration.sql"] };
}

function blastHeadingRows(label: string, columns: number): DemoRow[] {
  const rows: DemoRow[] = [];
  let reachedLabel = false;
  for (const line of wrapTerminalText(`⚠ Blast Radius held a command (${label})`, columns)) {
    const labelStart = line.indexOf("(");
    if (labelStart >= 0) {
      rows.push(plainRow(color(line.slice(0, labelStart), `1;${RED}`) + color(line.slice(labelStart), DIM)));
      reachedLabel = true;
    } else rows.push(plainRow(color(line, reachedLabel ? DIM : `1;${RED}`)));
  }
  return rows;
}

function padBlastRows(rows: DemoRow[], columns: number): DemoRow[] {
  return fitRows(rows.map(row => ({ text: " " + row.text, targets: row.targets.map(target => ({ ...target, column: target.column + 1 })) })), columns);
}

function renderBlast(state: SimulationState, columns: number): DemoPanel {
  if (state.decision !== "command") return { rows: [] };
  const held = getHeldCommandFixture(state.prompt);
  if (!held) return { rows: [] };
  const report = blastReport(held.command);
  const contentColumns = Math.max(1, columns - 2);
  const elapsedSeconds = Math.floor((state.clockTick - state.decisionTick) * SIMULATION_TICK_MS / 1000);
  const secondsLeft = Math.max(0, BLAST_TIMEOUT_SECONDS - elapsedSeconds);
  const rows = blastHeadingRows(report.label, contentColumns);
  for (const line of wrapTerminalText(`$ ${held.command}`, contentColumns)) rows.push(plainRow(color(line, YELLOW)));
  for (const line of wrapTerminalText(report.summary, contentColumns)) rows.push(plainRow(color(line, "1")));
  for (const detail of report.details) {
    for (const line of wrapTerminalText(detail, Math.max(1, contentColumns - 2))) rows.push(plainRow(color(`  ${line}`, DIM)));
  }
  const decisions = actionRow([{ label: "Cancel", key: "c", action: { type: "deny" } }, { label: "Proceed", key: "y", action: { type: "proceed" } }]);
  const countdown = color(`auto-cancels in ${secondsLeft} s`, secondsLeft <= 10 ? YELLOW : DIM);
  if (terminalCellWidth(decisions.text + " " + countdown) <= contentColumns) rows.push({ ...decisions, text: decisions.text + " " + countdown });
  else rows.push(decisions, plainRow(countdown));
  return { rows: padBlastRows(rows, columns) };
}

function markdownControls(state: SimulationState, columns: number): DemoRow[] {
  const compareLabel = state.panel.tab === "Before" ? "Single" : "Before";
  const buttons: DemoButton[] = [
    { label: "Prev", key: "p", action: { type: "navigate", delta: -1 } },
    { label: "Next", key: "n", action: { type: "navigate", delta: 1 } },
    { label: compareLabel, key: "b", action: { type: "tab", value: compareLabel } },
    { label: "Render", key: "r", action: { type: "md-refresh" } },
    { label: state.panel.rendered ? "Text" : "Page", key: "t", action: { type: "render-toggle" } },
    { label: "Browser", key: "o", action: { type: "md-browser" } },
    { label: "Close", key: "q", action: { type: "close" } },
  ];
  const rows: DemoRow[] = [];
  let current: DemoButton[] = [];
  for (const button of buttons) {
    if (current.length > 0 && terminalCellWidth(actionRow([...current, button]).text) > columns) {
      rows.push(actionRow(current));
      current = [];
    }
    current.push(button);
  }
  if (current.length > 0) rows.push(actionRow(current));
  return rows;
}

type MarkdownFixtureBlock = { startLine: number; text: string; headingLevel: number };
type MarkdownFixtureChunk = { startLine: number; source: string };

function markdownFixtureChunks(lines: string[]): MarkdownFixtureChunk[] {
  const chunks: MarkdownFixtureChunk[] = [];
  let lineIndex = 0;
  while (lineIndex < lines.length) {
    if (lines[lineIndex].trim() === "") {
      lineIndex += 1;
      continue;
    }
    const startLine = lineIndex;
    const source: string[] = [];
    while (lineIndex < lines.length && lines[lineIndex].trim() !== "") {
      source.push(lines[lineIndex]);
      lineIndex += 1;
    }
    chunks.push({ startLine, source: source.join("\n").trim() });
  }
  return chunks;
}

function changedMarkdownBlockStarts(previous: string[] | null, lines: string[]): number[] {
  if (previous === null || previous.join("\n").trim() === "") return [];
  const previousCounts = new Map<string, number>();
  for (const chunk of markdownFixtureChunks(previous)) previousCounts.set(chunk.source, (previousCounts.get(chunk.source) ?? 0) + 1);
  const changed: number[] = [];
  for (const chunk of markdownFixtureChunks(lines)) {
    const count = previousCounts.get(chunk.source) ?? 0;
    if (count > 0) previousCounts.set(chunk.source, count - 1);
    else changed.push(chunk.startLine);
  }
  return changed;
}

function parseMarkdownFixtureBlocks(lines: string[]): MarkdownFixtureBlock[] {
  const blocks: MarkdownFixtureBlock[] = [];
  let lineIndex = 0;
  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (line.trim() === "") {
      lineIndex += 1;
      continue;
    }
    const heading = MARKDOWN_HEADING.exec(line);
    if (heading) {
      blocks.push({ startLine: lineIndex, text: heading[2], headingLevel: heading[1].length });
      lineIndex += 1;
      continue;
    }
    const startLine = lineIndex;
    const paragraph: string[] = [];
    while (lineIndex < lines.length && lines[lineIndex].trim() !== "" && !MARKDOWN_HEADING.test(lines[lineIndex])) {
      paragraph.push(lines[lineIndex].trim());
      lineIndex += 1;
    }
    blocks.push({ startLine, text: paragraph.join(" "), headingLevel: 0 });
  }
  return blocks;
}

function markdownTextRows(lines: string[], previous: string[] | null, columns: number): DemoRow[] {
  const rows: DemoRow[] = [];
  const changedStarts = changedMarkdownBlockStarts(previous, lines);
  const contentColumns = Math.max(1, columns - 2);
  for (const block of parseMarkdownFixtureBlocks(lines)) {
    if (rows.length > 0) rows.push(plainRow(" "));
    const changed = changedStarts.includes(block.startLine);
    const marker = changed ? color("▌", GREEN) : " ";
    for (const wrapped of wrapTerminalText(block.text, contentColumns)) {
      let formatted = wrapped;
      if (block.headingLevel > 0) formatted = color(wrapped, block.headingLevel <= 2 ? "1;35" : "1;36");
      rows.push(plainRow(marker + formatted));
    }
    if (block.headingLevel > 0 && block.headingLevel <= 2) {
      const ruleWidth = Math.min(contentColumns, Math.max(MARKDOWN_HEADING_MINIMUM_RULE, terminalCellWidth(block.text)));
      rows.push(plainRow(marker + color("─".repeat(ruleWidth), DIM)));
    }
  }
  return rows;
}

function markdownCurrentLines(state: SimulationState, path: string): string[] {
  const file = getMarkdownFixture(path);
  if (markdownShowsBefore(state, path)) return file.before;
  return file.after;
}

function renderMarkdown(state: SimulationState, columns: number): DemoPanel {
  if (!state.panel.open) return { rows: [] };
  const rows = markdownControls(state, columns);
  const paths = state.markdownFiles ?? [];
  if (paths.length === 0) {
    rows.push(plainRow(color("No Markdown edits yet. /md <path> opens a file.", DIM)));
    return { rows: fitRows(rows, columns) };
  }
  const path = selectedMarkdownPath(state);
  const selection = Math.max(0, paths.indexOf(path));
  const file = getMarkdownFixture(path);
  const isPair = state.panel.tab === "Pair" && state.markdownPair !== null;
  const isEdited = !markdownShowsBefore(state, path);
  const currentLines = markdownCurrentLines(state, path);
  const previousLines = isEdited ? file.before : null;
  let name = file.path;
  let info = `  ${selection + 1}/${paths.length}`;
  if (isPair && state.markdownPair) {
    name = `${state.markdownPair[0]} | ${state.markdownPair[1]}`;
    info = "  side by side";
  } else {
    if (state.panel.tab === "Before") info += isEdited ? " · before | after" : " · new file, no earlier version";
    if (changedMarkdownBlockStarts(previousLines, currentLines).length > 0) info += " · green bar: changed in the last edit";
  }
  rows.push(plainRow(color(name, "1") + color(info, DIM)));
  if (state.panel.rendered) {
    const graphicOffset = rows.length;
    rows.push(...blankRows(MARKDOWN_GRAPHIC_HEIGHT));
    return { rows: fitRows(rows, columns), graphic: "markdown", graphicOffset, graphicHeight: MARKDOWN_GRAPHIC_HEIGHT };
  }
  if (isPair && state.markdownPair) {
    let previousPairLines: string[] | null = null;
    for (const path of state.markdownPair) {
      const pairLines = markdownCurrentLines(state, path);
      rows.push(plainRow(color(`── ${path} ──`, `1;${YELLOW}`)), plainRow(""));
      rows.push(...markdownTextRows(pairLines, previousPairLines, columns), plainRow(""));
      previousPairLines = pairLines;
    }
  } else if (state.panel.tab === "Before" && isEdited) {
    rows.push(plainRow(color("── Before ──", `1;${YELLOW}`)), plainRow(""));
    rows.push(...markdownTextRows(file.before, null, columns), plainRow(""));
    rows.push(plainRow(color("── After ──", `1;${YELLOW}`)), plainRow(""));
    rows.push(...markdownTextRows(currentLines, previousLines, columns));
  } else rows.push(...markdownTextRows(currentLines, previousLines, columns));
  return { rows: fitRows(rows, columns) };
}

function musicClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor(safeSeconds % 3600 / 60);
  const tail = String(safeSeconds % 60).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${tail}`;
  return `${minutes}:${tail}`;
}

type MusicTrack = { name: string; artist: string; lyrics: { at: number; text: string }[] };

function musicTrack(index: number): MusicTrack {
  const normalizedIndex = ((index % 3) + 3) % 3;
  if (normalizedIndex === 1) return { name: "Long Way Home", artist: "Mira Vale", lyrics: [{ at: 0, text: "" }, { at: 8, text: "Every small step leaves a light behind" }, { at: 35, text: "The road remembers where we started" }, { at: 60, text: "We keep a little warmth for the way home" }] };
  if (normalizedIndex === 2) return { name: "A Quiet Window", artist: "Mira Vale", lyrics: [{ at: 0, text: "" }, { at: 8, text: "A quiet window opens to the morning" }, { at: 35, text: "The city wakes beneath a silver sky" }, { at: 60, text: "We let the morning take its time" }] };
  return { name: "Paper Satellites", artist: "Mira Vale", lyrics: [{ at: 0, text: "" }, { at: 8, text: "Fold a little sky and let it find its way" }, { at: 35, text: "Across the roofs a paper orbit turns" }, { at: 60, text: "We send a quiet signal through the light" }] };
}

function musicLyric(track: MusicTrack, seconds: number): string {
  let text = "";
  for (const line of track.lyrics) {
    if (line.at > seconds + LYRIC_LEAD_SECONDS) break;
    text = line.text;
  }
  return text;
}

function musicProgress(position: number): string {
  const done = Math.round(Math.min(1, Math.max(0, position / MUSIC_DURATION_SECONDS)) * MUSIC_BAR_WIDTH);
  return color("━".repeat(done), MUSIC_GREEN) + color("─".repeat(MUSIC_BAR_WIDTH - done), DIM);
}

function renderMusic(state: SimulationState, columns: number): DemoPanel {
  if (!state.panel.open) return { rows: [] };
  const track = musicTrack(state.playback.track);
  const position = Math.min(MUSIC_DURATION_SECONDS, state.playback.position);
  let text = color("⏸", DIM) + color(` ${track.name}`, DIM) + color(` · ${track.artist}`, DIM);
  if (state.playback.playing) text = "🎵" + color(` ${track.name}`, "1") + color(` · ${track.artist}`, DIM) + "  " + musicProgress(position) + color(` ${musicClock(position)}/${musicClock(MUSIC_DURATION_SECONDS)}`, DIM);
  const buttons: DemoButton[] = [{ label: "⏮", key: "b", action: { type: "music-prev" } }, { label: state.playback.playing ? "⏸" : "▶", key: "p", action: { type: "music-toggle" } }, { label: "⏭", key: "n", action: { type: "music-next" } }];
  const controlsWidth = terminalCellWidth(adjacentActionRow("", buttons).text);
  const textColumns = Math.max(1, columns - controlsWidth - 3);
  const fittedText = fitText(text, textColumns);
  const first = adjacentActionRow(" " + fittedText + "  ", buttons);
  const rows: DemoRow[] = [first];
  const lyric = musicLyric(track, position);
  if (state.playback.playing && lyric !== "") rows.push(plainRow(" " + color(`   ♪ ${lyric}`, `3;${DIM}`)));
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
