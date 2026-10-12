import { AGENT_TICK, CHECK_TICK, EDIT_TICK, READ_TICK, REPLY_TICK, SIMULATION_TICK_MS } from "../demo-config.ts";
import { actionRow, bar, color, fitText, plainRow, stripAnsi, terminalCellWidth, wrapTerminalText } from "../demo-render.ts";
import { browserContextPrompt, FIXTURE_FILES, type FixtureFile } from "../demo-fixtures.ts";
import { finalReply } from "../mod-simulation.ts";
import type { DemoDefinition, DemoPanel, DemoRow, SimulationState, TranscriptEntry } from "../demo-types.ts";

const MOCHA_ACCENT = "38;2;203;166;247";
const MOCHA_HEADING = "38;2;249;226;175";
const MOCHA_TEXT = "38;2;205;214;244";
const MOCHA_MUTED = "38;2;108;112;134";
const MOCHA_RULE = "38;2;88;91;112";
const FILE_ACCENT = "38;2;91;155;213";
const FILE_MODIFIED = "38;2;229;192;123";
const FILE_READ = "38;2;192;160;255";
const FILE_WRITE = "38;2;255;162;76";
const TASK_RUNNING = "38;2;121;192;255";
const TASK_DONE = "38;2;63;185;80";
const TASK_STALLED = "38;2;210;153;34";
const TASK_ERROR = "38;2;248;81;73";
const TASK_DOWNLOAD_SECONDS = 24;
const TASK_INDEX_SECONDS = 30;
const TASK_ERROR_SECONDS = 34;
const TASK_DONE_RETENTION_SECONDS = 10;
const TASK_DOWNLOAD_FILES = 1000;
const TASK_STALLED_FILES = 412;
const TASK_STALLED_TOTAL = 3400;
const TASK_BAR_WIDTH = 12;

export const PANE_DEMOS: DemoDefinition[] = [
  {
    id: "terminal-browser", placement: "right-pane", startupCommand: "/browser local://example", startsOpen: true, initialTab: "main",
    example: "Review the example page and improve its navigation.",
    instructions: "Browse the sample page beside Claude. Send to agent puts page context in your prompt; press Send when you are ready.",
    limitation: "A local fixture replaces the mod's remote browser. No websites are fetched and no browser service runs.",
    source: "https://github.com/zenbu-labs/terminal-browser/blob/2165ae76c9639e3996829ab0e6d54ddbd4f06ad8/claude-code-plugin/hooks/register.tsx",
    controls: [{ label: "Open / close browser", action: { type: "toggle" } }, { label: "Send page to agent", action: { type: "fill-composer", text: browserContextPrompt("local://example") } }],
  },
  {
    id: "image-view", placement: "above-prompt", startupCommand: "", startsOpen: true, initialTab: "main",
    example: "Describe this image and suggest an accessible caption.",
    instructions: "An attached sample gets a thumbnail above the prompt. Sending the message removes it from the composer, just like the mod.",
    limitation: "The sample is an existing Modshelf illustration. This preview uses a local attachment fixture and sends no image to a model.",
    source: "https://github.com/jarrodwatts/claude-image-view/blob/370b8e7bc0708bebe9762e63534f7ca18bc3e802/hooks/register.tsx",
    controls: [{ label: "Attach sample", action: { type: "attach" } }, { label: "Remove attachment", action: { type: "remove-attachment" } }],
  },
  {
    id: "prismantis", placement: "transcript", startupCommand: "/prismantis demo", startsOpen: true, initialTab: "catppuccin-mocha",
    example: "Show a table and a TypeScript example for the change.",
    instructions: "Send a prompt to see themed messages, tool output, tables and fenced code. Copy and folding controls work locally.",
    limitation: "Catppuccin Mocha formatting is recreated from the renderer. Responses are fixed examples. Copy supports the reply, code and Markdown table; ASCII table export is omitted.",
    source: "https://github.com/NahumLitvin/prismantis/blob/03375f7e5245b41babfe31299f99924177b10a94/hooks/register.tsx",
    controls: [{ label: "Fold / expand code", action: { type: "render-toggle" } }, { label: "Copy reply", action: { type: "copy", format: "text" } }, { label: "Copy code", action: { type: "copy", format: "code" } }],
  },
  {
    id: "flightdeck", placement: "right-pane", startupCommand: "", startsOpen: true, initialTab: "main",
    example: "Review the project, make the change, and run its checks.",
    instructions: "Watch the main request, context and two subagents while Claude works. Select an agent to inspect its task and recent tools.",
    limitation: "Model, usage, agents and receipts are fixture events. This dashboard does not read your Claude account or session.",
    source: "https://github.com/scasella/claude-flightdeck/blob/830c4de3692a9c9d7f2d226b6d9988e6333cff94/hooks/register.tsx",
    controls: [{ label: "Main", action: { type: "select", index: 0 } }, { label: "Explorer", action: { type: "select", index: 1 } }, { label: "Reviewer", action: { type: "select", index: 2 } }, { label: "Open / close Flightdeck", action: { type: "toggle" } }],
  },
  {
    id: "filetree", placement: "right-pane", startupCommand: "", startsOpen: true, initialTab: "main",
    example: "Read src/app.ts, improve the handler, and run the tests.",
    instructions: "Read and edit events reveal and highlight fixture files. Select a path to include it with your next prompt; search, hidden files and size controls work.",
    limitation: "The tree and Git changes belong to a local example project. No files are read from or opened on your computer.",
    source: "https://github.com/data-goblin/claude-code-filetree/blob/b0e4098b66718c8aa99e4886b8f400d89c4cb2cc/hooks/register.tsx",
    controls: [{ label: "Hidden files", action: { type: "file-hidden" } }, { label: "Size / date", action: { type: "file-size" } }, { label: "Collapse folders", action: { type: "file-collapse" } }, { label: "Refresh tree", action: { type: "file-refresh" } }],
  },
  {
    id: "prompt-rail", placement: "above-prompt", startupCommand: "", startsOpen: true, initialTab: "main",
    example: "Improve the example project's header spacing.",
    instructions: "Each prompt adds a tick. Select a tick to return to that prompt in the transcript, or switch to the vertical rail.",
    limitation: "The rail tracks only prompts in this local simulation. It cannot read or rewind an existing Claude conversation.",
    source: "https://github.com/oikon48/prompt-rail/blob/2ac50fb87fc426fed89ba0f09f1784ef6f289ae8/plugins/prompt-rail/hooks/index.tsx",
    controls: [{ label: "Horizontal / vertical", action: { type: "orientation-toggle" } }, { label: "Previous prompt", action: { type: "navigate", delta: -1 } }, { label: "Next prompt", action: { type: "navigate", delta: 1 } }, { label: "Hide / show rail", action: { type: "toggle" } }],
  },
  {
    id: "pull-request-pane", placement: "right-pane", startupCommand: "/pull-request-pane", startsOpen: true, initialTab: "main",
    example: "Review the example pull request and summarize its changes.",
    instructions: "Expand the checks and draft comments on the sample PR. Submit comments sends one prompt to Claude for the simulated work turn.",
    limitation: "PR #42 and its checks are fictional. Comments stay in this page and are never published to GitHub.",
    source: "https://github.com/meganemura/pull-request-pane/blob/2b072514053814083609a3e6b45ca4d602448f9f/plugin/hooks/mod.ts",
    controls: [{ label: "Refresh PR", action: { type: "file-refresh" } }, { label: "Open / close PR", action: { type: "toggle" } }],
  },
  {
    id: "taskline", placement: "above-prompt", startupCommand: "/taskline demo", startsOpen: true, initialTab: "main",
    example: "Explain the download progress while these jobs run.",
    instructions: "The mod's own demo jobs run on their own clock. Watch Bridge finish, Index count items, and Tiles report a stalled download and then an error.",
    limitation: "The original /taskline demo job sequence is recreated over 35 seconds. It does not run downloads or read progress files.",
    source: "https://github.com/pepperonas/taskline/blob/1b69e4216559f916c4cb31c5140c19f9c3c70410/hooks/register.tsx",
    controls: [{ label: "Hide / show tasks", action: { type: "toggle" } }, { label: "Single / stacked", action: { type: "orientation-toggle" } }, { label: "Clear tasks", action: { type: "task-clear" } }, { label: "Run demo again", action: { type: "replay" } }],
  },
];

function clippedRows(rows: DemoRow[], columns: number): DemoRow[] {
  const clipped: DemoRow[] = [];
  for (const row of rows) {
    const targets: DemoRow["targets"] = [];
    for (const target of row.targets) {
      if (target.column > columns) continue;
      targets.push({ ...target, width: Math.min(target.width, columns - target.column + 1) });
    }
    clipped.push({ text: fitText(row.text, columns), targets });
  }
  return clipped;
}

function targetedRow(text: string, index: number, columns: number): DemoRow {
  return { text: fitText(text, columns), targets: [{ column: 1, width: Math.min(columns, terminalCellWidth(text)), action: { type: "select", index } }] };
}

function roundedBox(content: string[], columns: number, tint: string): DemoRow[] {
  const width = Math.max(12, Math.min(columns, 66));
  const rows = [plainRow(color(`╭${"─".repeat(width - 2)}╮`, tint))];
  for (const line of content) {
    const fitted = fitText(line, width - 4);
    const padding = " ".repeat(Math.max(0, width - 4 - terminalCellWidth(fitted)));
    rows.push(plainRow(color("│ ", tint) + fitted + padding + color(" │", tint)));
  }
  rows.push(plainRow(color(`╰${"─".repeat(width - 2)}╯`, tint)));
  return rows;
}

function renderBrowser(state: SimulationState, columns: number): DemoPanel {
  const rows = [plainRow(color("browser · Example project", "1")), plainRow("")];
  for (let row = 0; row < 8; row += 1) rows.push(plainRow(""));
  rows.push(actionRow([
    { label: "Send to agent", action: { type: "fill-composer", text: browserContextPrompt(state.browserUrl) } },
    { label: "Close", action: { type: "close" } },
  ]));
  return { rows: clippedRows(rows, columns), graphic: "browser", graphicOffset: 2, graphicHeight: 8, status: "Local example page · page context fills your prompt without sending it" };
}

function renderAttachment(columns: number): DemoPanel {
  const rows = [plainRow(color("╭──────────────╮", "2"))];
  for (let row = 0; row < 5; row += 1) rows.push(plainRow(color("│              │", "2")));
  rows.push(plainRow(color("│      #1      │", "2")), plainRow(color("╰──────────────╯", "2")));
  return { rows: clippedRows(rows, columns), graphic: "attachment", graphicOffset: 1, graphicHeight: 5, graphicWidth: 16, status: "Composer attachment [Image #1]" };
}

function latestAssistant(state: SimulationState): TranscriptEntry | undefined {
  for (let index = state.transcript.length - 1; index >= 0; index -= 1) {
    const entry = state.transcript[index];
    if (entry.role === "assistant" && entry.turn === state.turn) return entry;
  }
  return undefined;
}

function wantsStructuredReply(state: SimulationState): boolean {
  if (!state.prompt) return true;
  return /table|code|typescript|compare|report/i.test(state.prompt);
}

function currentReply(state: SimulationState): string {
  const completedReply = latestAssistant(state);
  if (completedReply) return completedReply.text;
  if (state.phase === "working") {
    const reply = finalReply(state);
    const progress = Math.min(1, (state.tick - REPLY_TICK + 1) / 8);
    return reply.slice(0, Math.ceil(reply.length * progress));
  }
  return "The example change is ready. The handler is clearer and the checks pass.";
}

function renderPrismantis(state: SimulationState, columns: number): DemoPanel {
  if (state.phase === "working" && state.tick < REPLY_TICK) return { rows: [] };
  const replyLines = wrapTerminalText(currentReply(state), Math.max(1, columns - 2));
  const rows: DemoRow[] = [];
  for (let index = 0; index < replyLines.length; index += 1) {
    const prefix = index === 0 ? color("●", MOCHA_ACCENT) + " " : "  ";
    rows.push(plainRow(prefix + color(replyLines[index], MOCHA_TEXT)));
  }
  rows.push(plainRow(""));
  if (wantsStructuredReply(state)) {
    rows.push(
      plainRow(color("  ┌─────────────┬─────────────┐", MOCHA_RULE)),
      plainRow(color("  │ Change      │ Result      │", MOCHA_HEADING)),
      plainRow(color("  ╞═════════════╪═════════════╡", MOCHA_RULE)),
      plainRow(color("  │ Handler     │ Simplified  │", MOCHA_TEXT)),
      plainRow(color("  │ Checks      │ Passing     │", MOCHA_TEXT)),
      plainRow(color("  └─────────────┴─────────────┘", MOCHA_RULE)),
      actionRow([{ label: "⧉ md", action: { type: "copy", format: "markdown" } }]),
      plainRow(""),
      plainRow(color("  ── typescript", MOCHA_ACCENT)),
      plainRow("  " + color("export function summarize(input: string) {", MOCHA_TEXT)),
    );
    if (state.panel.rendered) {
      rows.push(plainRow("  " + color("  return input.trim();", MOCHA_TEXT)), plainRow("  " + color("}", MOCHA_TEXT)));
    } else {
      rows.push(plainRow(color("  +2 more lines", MOCHA_MUTED)));
    }
    const foldLabel = state.panel.rendered ? "show less" : "show more";
    rows.push(actionRow([{ label: "⧉ copy", action: { type: "copy", format: "code" } }, { label: foldLabel, action: { type: "render-toggle" } }]));
  }
  rows.push(actionRow([{ label: "⧉ copy reply", action: { type: "copy", format: "text" } }]));
  return { rows: clippedRows(rows, columns), status: "Catppuccin Mocha · transcript renderer" };
}

function agentStatus(state: SimulationState, doneTick: number): string {
  if (state.tick >= doneTick || state.phase === "complete") return color("✓ done", "32");
  return color("◐ working", "33");
}

function renderFlightdeck(state: SimulationState, columns: number): DemoPanel {
  const isWorking = state.phase === "working" || state.phase === "decision";
  const mainStatus = isWorking ? color("● working", "33") : color("○ idle", "2");
  const contextTint = state.usage.context >= 80 ? "33" : "36";
  const rows = [plainRow(color("Flightdeck", "1")), ...roundedBox([
    `Sonnet · main  ${mainStatus}`,
    `effort ${color("▮▮▮▯", "36")}  mode default  ${state.turn} req`,
    `ctx ${color(bar(state.usage.context, 10), contextTint)} ${state.usage.context}%`,
    `cost $${state.usage.cost.toFixed(2)}  5h ${state.usage.fiveHour}%  7d ${state.usage.sevenDay}%`,
  ], columns, "36")];
  if (state.tick >= AGENT_TICK || state.phase === "complete") {
    rows.push(plainRow(color(isWorking ? "   ●──•──●" : "   ───────", "2")), plainRow(color("agents 2", "1")));
    rows.push(targetedRow(`  Explorer  ${agentStatus(state, CHECK_TICK - 4)}`, 1, columns));
    rows.push(targetedRow(`  Reviewer  ${agentStatus(state, CHECK_TICK + 4)}`, 2, columns));
    if (state.panel.selection === 1) {
      rows.push(plainRow(color("  task: inspect the handler and its imports", "2")), plainRow("  Read src/app.ts · Grep summarize"));
    }
    if (state.panel.selection === 2) {
      rows.push(plainRow(color("  task: check the change and its tests", "2")), plainRow("  Read tests/app.test.ts · Bash npm test"));
    }
  }
  if (state.phase === "complete") {
    rows.push(plainRow(color("receipt", "1")), plainRow(`✓ Request ${state.turn} complete · 4 tools`), plainRow("  Read → Edit → Check → Answer"));
  }
  rows.push(actionRow([{ label: "Close", action: { type: "close" } }]));
  return { rows: clippedRows(rows, columns), status: "Simulated session usage and agents" };
}

function visibleFixtureFiles(state: SimulationState): FixtureFile[] {
  const visible: FixtureFile[] = [];
  const query = state.files.query.trim().toLowerCase();
  for (const file of FIXTURE_FILES) {
    if (file.hidden && !state.files.hidden) continue;
    if (query && !file.path.toLowerCase().includes(query)) continue;
    if (!query && state.files.collapsed && file.path.includes("/")) continue;
    visible.push(file);
  }
  return visible;
}

function fileRow(state: SimulationState, file: FixtureFile, columns: number): DemoRow {
  let tint = "37";
  let suffix = state.files.sizes ? file.size : "Oct 12";
  if (file.path === "src/app.ts" && state.tick >= READ_TICK) tint = FILE_READ;
  if (file.path === "src/app.ts" && state.tick >= EDIT_TICK) {
    tint = FILE_WRITE;
    suffix = color("M +8 -2", FILE_MODIFIED);
  }
  let label = file.label;
  if (state.files.query) label = `· ${file.path}`;
  const labelWidth = Math.max(16, Math.min(30, columns - 12));
  const padding = " ".repeat(Math.max(1, labelWidth - label.length));
  let text = color(label, tint) + padding + color(suffix, "2");
  if (state.panel.selection === file.index) text = color(stripAnsi(text), "7");
  return targetedRow(text, file.index, columns);
}

function renderFiletree(state: SimulationState, columns: number): DemoPanel {
  const hasEdit = state.tick >= EDIT_TICK;
  const rows = [plainRow(color("Files: example-project", "1")), plainRow(color("main ↑0 ↓0", FILE_ACCENT) + color(hasEdit ? "  M:1  +8 -2" : "  clean", "2"))];
  rows.push(actionRow([
    { label: "↻", action: { type: "file-refresh" } },
    { label: state.files.hidden ? "◉" : "○", action: { type: "file-hidden" } },
    { label: "Σ", action: { type: "file-size" } },
    { label: "⊟", action: { type: "file-collapse" } },
  ]));
  rows.push(plainRow(color(`/ ${state.files.query || "search files"}`, "2")));
  const files = visibleFixtureFiles(state);
  let previousFolder = "";
  for (const file of files) {
    const folder = file.path.includes("/") ? file.path.split("/")[0] : "";
    if (folder && folder !== previousFolder && !state.files.query) rows.push(plainRow(color(`▾ ■ ${folder}`, FILE_ACCENT)));
    rows.push(fileRow(state, file, columns));
    previousFolder = folder;
  }
  if (state.files.collapsed && !state.files.query) {
    rows.splice(4, 0, plainRow(color("▸ ■ src", FILE_ACCENT)), plainRow(color("▸ ■ tests", FILE_ACCENT)));
  }
  if (files.length === 0) rows.push(plainRow(color("No matching files", "2")));
  const selected = FIXTURE_FILES.find((file) => file.index === state.panel.selection);
  if (selected) rows.push(plainRow(""), plainRow(color(selected.path, FILE_ACCENT)));
  return { rows: clippedRows(rows, columns), status: selected ? `Selected ${selected.path} · included with your next prompt` : "Local example project · select a file to include its path" };
}

function userPrompts(state: SimulationState): TranscriptEntry[] {
  const prompts: TranscriptEntry[] = [];
  for (const entry of state.transcript) {
    if (entry.role !== "user") continue;
    if (entry.text.startsWith("/")) continue;
    prompts.push(entry);
  }
  return prompts;
}

function renderPromptRail(state: SimulationState, columns: number): DemoPanel {
  const prompts = userPrompts(state);
  if (prompts.length === 0) return { rows: [plainRow(color("No prompts yet", "2"))] };
  let selection = prompts.length - 1;
  if (state.panel.selection >= 0) selection = Math.min(state.panel.selection, prompts.length - 1);
  const selected = prompts[selection];
  const rows: DemoRow[] = [];
  if (state.panel.vertical) {
    rows.push(plainRow(color("Prompts", "2")));
    for (let index = 0; index < prompts.length; index += 1) {
      const glyph = index === selection ? "━" : color("─", "2");
      const label = columns >= 12 ? ` ${glyph} ${prompts[index].text}` : ` ${glyph} `;
      rows.push(targetedRow(label, index, columns));
    }
  } else {
    rows.push(plainRow(fitText(` #${selection + 1} ${selected.text}`, columns)));
    const ticks: DemoRow = { text: "  ", targets: [] };
    let column = 3;
    for (let index = 0; index < prompts.length; index += 1) {
      ticks.text += index === selection ? "┃ " : color("│ ", "2");
      ticks.targets.push({ column, width: 1, action: { type: "select", index } });
      column += 2;
    }
    rows.push(ticks);
  }
  return { rows: clippedRows(rows, columns), status: `Prompt ${selection + 1} of ${prompts.length} · select to scroll to its transcript entry` };
}

function renderPullRequest(state: SimulationState, columns: number): DemoPanel {
  const checksExpanded = state.panel.tab === "checks";
  const checkLabel = checksExpanded ? "▼ checks · ✓2 · APPROVED · MERGEABLE" : "▶ checks · passing";
  const rows = [plainRow(color("↻ refreshed · example PR", "2")), plainRow(color("#42 PR Open", "32")), plainRow(color("Simplify the example request handler", "1")), actionRow([{ label: checkLabel, action: { type: "tab", value: checksExpanded ? "main" : "checks" } }])];
  if (checksExpanded) {
    rows.push(plainRow(color("  ✓ TypeScript       passing", "32")), plainRow(color("  ✓ Unit tests       passing", "32")));
  }
  const firstParagraph = "This change makes the handler easier to read";
  const secondParagraph = "and adds tests for the empty-input case.";
  rows.push(plainRow(""), targetedRow(state.panel.selection === 1 ? color(firstParagraph, "7") : firstParagraph, 1, columns), targetedRow(state.panel.selection === 2 ? color(secondParagraph, "7") : secondParagraph, 2, columns), plainRow(color("────────────────────────────────────", "2")), plainRow("Comments for Claude"));
  for (let index = 0; index < state.review.comments.length; index += 1) {
    rows.push({ text: color("x", "2") + ` ${state.review.comments[index]}`, targets: [{ column: 1, width: 1, action: { type: "review-remove", index } }] });
  }
  rows.push(plainRow(color(state.review.draft || "Write a comment in the field below", "2")));
  if (state.review.draft.trim()) rows.push(actionRow([{ label: "Add comment", action: { type: "review-add" } }]));
  if (state.review.comments.length > 0) rows.push(actionRow([{ label: `Submit ${state.review.comments.length} comments`, action: { type: "review-submit" } }]));
  return { rows: clippedRows(rows, columns), status: "Fictional PR · submit comments as one prompt to Claude" };
}

function taskElapsedSeconds(state: SimulationState): number {
  return Math.max(0, (state.clockTick - state.taskStartedAt) * SIMULATION_TICK_MS / 1000);
}

function downloadTask(elapsed: number): string {
  if (elapsed >= TASK_DOWNLOAD_SECONDS) return color("Bridge ✔ 1000/1000 files in 24s", TASK_DONE);
  const progress = elapsed / TASK_DOWNLOAD_SECONDS;
  const doneFiles = Math.round(TASK_DOWNLOAD_FILES * progress);
  const remaining = Math.ceil(TASK_DOWNLOAD_SECONDS - elapsed);
  return color(`Bridge ↓ ${bar(progress * 100, TASK_BAR_WIDTH)} ${doneFiles}/1000 files · ETA ${remaining}s`, TASK_RUNNING);
}

function stalledTask(elapsed: number): string {
  if (elapsed >= TASK_ERROR_SECONDS) return color(`Tiles ✖ HTTP 503 from tile server · ${TASK_STALLED_FILES}/${TASK_STALLED_TOTAL} files`, TASK_ERROR);
  return color(`Tiles ⏸ ${bar(TASK_STALLED_FILES / TASK_STALLED_TOTAL * 100, TASK_BAR_WIDTH)} ${TASK_STALLED_FILES}/${TASK_STALLED_TOTAL} files · stalled 2m`, TASK_STALLED);
}

function indexTask(elapsed: number): string {
  if (elapsed >= TASK_INDEX_SECONDS) return color("Index ✔ 4286 items in 30s", TASK_DONE);
  return color(`Index ◌ ${Math.round(elapsed * 1000 / 7)} items · 143 items/s`, TASK_RUNNING);
}

function renderTaskline(state: SimulationState, columns: number): DemoPanel {
  if (state.tasksCleared) return { rows: [] };
  const elapsed = taskElapsedSeconds(state);
  const taskRows = [stalledTask(elapsed)];
  if (elapsed < TASK_DOWNLOAD_SECONDS + TASK_DONE_RETENTION_SECONDS) taskRows.push(downloadTask(elapsed));
  if (elapsed < TASK_INDEX_SECONDS + TASK_DONE_RETENTION_SECONDS) taskRows.push(indexTask(elapsed));
  const joined = taskRows.join(color(" │ ", "2"));
  const fitsSingleLine = Array.from(stripAnsi(joined)).length <= columns;
  if (!state.panel.vertical && fitsSingleLine) return { rows: [plainRow(joined)], status: "Local /taskline demo jobs · independent of Claude" };
  return { rows: clippedRows(taskRows.map(plainRow), columns), status: "Local /taskline demo jobs · independent of Claude" };
}

export function renderPanesDemo(state: SimulationState, columns: number): DemoPanel {
  if (!state.panel.open) return { rows: [] };
  switch (state.modId) {
    case "terminal-browser": return renderBrowser(state, columns);
    case "image-view": return state.attachment ? renderAttachment(columns) : { rows: [] };
    case "prismantis": return renderPrismantis(state, columns);
    case "flightdeck": return renderFlightdeck(state, columns);
    case "filetree": return renderFiletree(state, columns);
    case "prompt-rail": return renderPromptRail(state, columns);
    case "pull-request-pane": return renderPullRequest(state, columns);
    case "taskline": return renderTaskline(state, columns);
    default: return { rows: [] };
  }
}
