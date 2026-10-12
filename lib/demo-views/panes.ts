import { AGENT_TICK, CHECK_TICK, EDIT_TICK, READ_TICK, REPLY_TICK, SIMULATION_TICK_MS } from "../demo-config.ts";
import { actionRow, color, fitText, plainRow, stripAnsi, terminalCellWidth, wrapTerminalText } from "../demo-render.ts";
import { FIXTURE_FILES, type FixtureFile } from "../demo-fixtures.ts";
import { finalReply } from "../mod-simulation.ts";
import type { DemoAction, DemoButton, DemoDefinition, DemoPanel, DemoRow, SimulationState, TranscriptEntry } from "../demo-types.ts";

const MOCHA_ACCENT = "38;2;203;166;247";
const MOCHA_HEADING = "38;2;249;226;175";
const MOCHA_TEXT = "38;2;205;214;244";
const MOCHA_MUTED = "38;2;108;112;134";
const MOCHA_RULE = "38;2;88;91;112";
const FILE_ACCENT = "38;2;91;155;213";
const FILE_MODIFIED = "38;2;229;192;123";
const FILE_READ = "38;2;192;132;252";
const FILE_WRITE = "38;2;249;115;22";
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
const TASK_DEMO_WRITER_SECONDS = 34;
const TASK_CELEBRATION_SECONDS = 2.8;
const TASK_CELEBRATION_QUEUE_LIMIT = 3;
const TASK_ERROR_RETENTION_SECONDS = 3600;
const TASK_SOURCE_UPDATE_SECONDS = 0.5;
const TASK_STALLED_AGE_SECONDS = 95;
const TASK_DOWNLOAD_BYTES = 3.1e9;
const FILE_FLASH_SECONDS = 2.7;
const FILE_MUTED = "38;2;128;138;150";
const FILE_ADDED = "38;2;152;195;121";
const FILE_DELETED = "38;2;224;108;117";
const FILE_SELECTED_BACKGROUND = "48;2;107;114;128";
const MOCHA_KEYWORD = "38;2;243;139;168";
const MOCHA_FUNCTION = "38;2;137;180;250";
const MOCHA_NUMBER = "38;2;166;227;161";
const PRISMANTIS_FOLD_THRESHOLD = 30;
const PRISMANTIS_FOLD_VISIBLE_LINES = 20;
const PRISMANTIS_NUMBER_THRESHOLD = 10;
const PRISMANTIS_NUMBER_MAXIMUM = 400;
const ATTACHMENT_SOURCE_WIDTH = 1500;
const ATTACHMENT_SOURCE_HEIGHT = 1049;
const ATTACHMENT_ROWS = 6;
const RAIL_INSET = 2;

export const PANE_DEMOS: DemoDefinition[] = [
  {
    id: "terminal-browser", placement: "right-pane", startupCommand: "/browser local://example", startsOpen: true, initialTab: "main",
    example: "Review the example page and improve its navigation.",
    instructions: "Browse the sample page beside Claude. Grab selects page context for your prompt; press Send when you are ready.",
    limitation: "A local fixture replaces the mod's remote browser. No websites are fetched and no browser service runs.",
    source: "https://github.com/zenbu-labs/terminal-browser/blob/2165ae76c9639e3996829ab0e6d54ddbd4f06ad8/claude-code-plugin/hooks/register.tsx",
    controls: [{ label: "Open / close browser", action: { type: "toggle" } }, { label: "Grab page content", action: { type: "browser-grab" } }],
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
    limitation: "Catppuccin Mocha formatting is recreated from the renderer. Responses are fixed examples. Reply, code, Markdown table and ASCII table copies work locally.",
    source: "https://github.com/NahumLitvin/prismantis/blob/915b8be882864bb7dc46bbfab800364bcd8cb38d/hooks/register.tsx",
    controls: [{ label: "Copy reply", action: { type: "copy", format: "text" } }],
  },
  {
    id: "flightdeck", placement: "right-pane", startupCommand: "", startsOpen: true, initialTab: "main",
    example: "Review the project, make the change, and run its checks.",
    instructions: "Watch the main request, context and two subagents while Claude works. Select an agent to inspect its task and recent tools.",
    limitation: "Model, usage, agents and receipts are fixture events. This dashboard does not read your Claude account or session.",
    source: "https://github.com/scasella/claude-flightdeck/blob/6150b9f40b0a36e42c22d39f03ddb81aaefe1844/hooks/register.tsx",
    controls: [{ label: "Main", action: { type: "select", index: 0 } }, { label: "Explorer", action: { type: "select", index: 1 } }, { label: "Reviewer", action: { type: "select", index: 2 } }, { label: "Compact", action: { type: "tab", value: "compact" } }, { label: "Wide", action: { type: "tab", value: "wide" } }, { label: "Mini", action: { type: "tab", value: "mini" } }, { label: "Open / close Flightdeck", action: { type: "toggle" } }],
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
    id: "taskline", placement: "above-prompt", startupCommand: "/taskline demo", startsOpen: true, initialTab: "auto",
    example: "Explain the download progress while these jobs run.",
    instructions: "The mod's own demo jobs run on their own clock. Watch Bridge finish, Index count items, and Tiles report a stalled download and then an error.",
    limitation: "The original /taskline demo job sequence is recreated over 35 seconds. It does not run downloads or read progress files.",
    source: "https://github.com/pepperonas/taskline/blob/1b69e4216559f916c4cb31c5140c19f9c3c70410/hooks/register.tsx",
    controls: [{ label: "Hide / show tasks", action: { type: "toggle" } }, { label: "Auto layout", action: { type: "tab", value: "auto" } }, { label: "Single row", action: { type: "tab", value: "single" } }, { label: "Stacked rows", action: { type: "tab", value: "stacked" } }, { label: "Clear finished", action: { type: "task-clear" } }, { label: "Clear all", action: { type: "task-clear", all: true } }, { label: "Run demo again", action: { type: "replay" } }],
  },
];

function plainControlsRow(buttons: DemoButton[], gap = 2): DemoRow {
  const row: DemoRow = { text: "", targets: [] };
  let column = 1;
  for (const button of buttons) {
    if (row.text) { row.text += " ".repeat(gap); column += gap; }
    row.text += button.label;
    const width = terminalCellWidth(button.label);
    row.targets.push({ column, width, action: button.action, key: button.key });
    column += width;
  }
  return row;
}

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
  const width = Math.max(4, Math.min(columns, 66));
  const rows = [plainRow(color(`╭${"─".repeat(width - 2)}╮`, tint))];
  for (const line of content) {
    const fitted = fitText(line, width - 4);
    const padding = " ".repeat(Math.max(0, width - 4 - terminalCellWidth(fitted)));
    rows.push(plainRow(color("│ ", tint) + fitted + padding + color(" │", tint)));
  }
  rows.push(plainRow(color(`╰${"─".repeat(width - 2)}╯`, tint)));
  return rows;
}

function appendBrowserControl(row: DemoRow, label: string, action?: DemoAction): void {
  if (row.text) row.text += "  ";
  const column = terminalCellWidth(row.text) + 1;
  row.text += label;
  if (action) row.targets.push({ column, width: terminalCellWidth(label), action });
}

function browserToolbar(state: SimulationState, columns: number): DemoRow {
  const row: DemoRow = { text: "", targets: [] };
  const history = state.browserHistory ?? [state.browserUrl];
  const historyIndex = state.browserHistoryIndex ?? 0;
  if (history.length > 1) {
    if (historyIndex > 0) appendBrowserControl(row, "←", { type: "browser-back" });
    else appendBrowserControl(row, color("←", "2"));
    if (historyIndex < history.length - 1) appendBrowserControl(row, "→", { type: "browser-forward" });
    else appendBrowserControl(row, color("→", "2"));
  }
  appendBrowserControl(row, "↻", { type: "browser-reload" });
  const controlsWidth = terminalCellWidth(row.text) + 12;
  appendBrowserControl(row, color(fitText(state.browserUrl, Math.max(4, columns - controlsWidth)), "2"));
  const grabLabel = state.browserGrab ? color("▧", "38;2;179;69;160") : "▧";
  appendBrowserControl(row, grabLabel, { type: "browser-grab" });
  appendBrowserControl(row, "•••", { type: "browser-menu" });
  return row;
}

function renderBrowser(state: SimulationState, columns: number): DemoPanel {
  const rows = [browserToolbar(state, columns), plainRow("")];
  for (let row = 0; row < 8; row += 1) rows.push(plainRow(""));
  if (state.browserMenu) rows.push(plainRow(color("Record", "2")), plainRow(color("Inspect", "2")), plainRow(color("Settings", "2")));
  return { rows: clippedRows(rows, columns), graphic: "browser", graphicOffset: 2, graphicHeight: 8 };
}

function renderAttachment(columns: number): DemoPanel {
  if (columns < 6) return { rows: [] };
  const pictureColumns = Math.max(4, Math.min(columns - 2, Math.round(ATTACHMENT_ROWS * 2 * ATTACHMENT_SOURCE_WIDTH / ATTACHMENT_SOURCE_HEIGHT)));
  const pictureRows = Math.max(1, Math.min(ATTACHMENT_ROWS, Math.round(pictureColumns * ATTACHMENT_SOURCE_HEIGHT / (2 * ATTACHMENT_SOURCE_WIDTH))));
  const rows = [plainRow(color(`╭${"─".repeat(pictureColumns)}╮`, "2"))];
  for (let row = 0; row < pictureRows; row += 1) rows.push(plainRow(color(`│${" ".repeat(pictureColumns)}│`, "2")));
  const beforeLabel = Math.floor((pictureColumns - 2) / 2);
  const afterLabel = pictureColumns - 2 - beforeLabel;
  rows.push(plainRow(color(`│${" ".repeat(beforeLabel)}#1${" ".repeat(afterLabel)}│`, "2")));
  rows.push(plainRow(color(`╰${"─".repeat(pictureColumns)}╯`, "2")));
  return { rows, graphic: "attachment", graphicOffset: 1, graphicHeight: pictureRows, graphicWidth: pictureColumns + 2 };
}

function latestAssistant(state: SimulationState): TranscriptEntry | undefined {
  for (let index = state.transcript.length - 1; index >= 0; index -= 1) {
    const entry = state.transcript[index];
    if (entry.role === "assistant" && entry.turn === state.turn) return entry;
  }
  return undefined;
}

const PRISMANTIS_DEMO = "The example change is ready.\n\n| Change | Result |\n| --- | --- |\n| Handler | Simplified |\n| Checks | Passing |\n\n```typescript\nexport function summarize(input: string) {\n  return input.trim();\n}\n```";

function currentReply(state: SimulationState): string {
  const completedReply = latestAssistant(state);
  if (completedReply) return completedReply.text;
  if (state.phase === "working") {
    const reply = finalReply(state);
    const progress = Math.min(1, (state.tick - REPLY_TICK + 1) / 8);
    return reply.slice(0, Math.ceil(reply.length * progress));
  }
  if (state.phase === "idle") return PRISMANTIS_DEMO;
  return "";
}

function prismantisCodeLine(line: string): string {
  const tokens = line.split(/(\b(?:export|function|return|const|let|if|else|string|number|boolean)\b|\b\d+\b|[A-Za-z_$][\w$]*(?=\())/g);
  let rendered = "";
  for (const token of tokens) {
    if (/^(export|function|return|const|let|if|else|string|number|boolean)$/.test(token)) rendered += color(token, MOCHA_KEYWORD);
    else if (/^\d+$/.test(token)) rendered += color(token, MOCHA_NUMBER);
    else if (/^[A-Za-z_$][\w$]*$/.test(token)) rendered += color(token, MOCHA_FUNCTION);
    else rendered += color(token, MOCHA_TEXT);
  }
  return rendered;
}

function copyRow(label: string, format: "text" | "code" | "markdown" | "art", text: string): DemoRow {
  return actionRow([{ label, action: { type: "copy", format, text } }]);
}

function indentRows(rows: DemoRow[], spaces: number): DemoRow[] {
  return rows.map(row => ({ text: " ".repeat(spaces) + row.text, targets: row.targets.map(target => ({ ...target, column: target.column + spaces })) }));
}

function renderPrismantisCode(state: SimulationState, lines: string[], language: string): DemoRow[] {
  const header = color(`── ${language || "code"}`, MOCHA_MUTED) + "    ";
  const copy = copyRow("⧉ copy", "code", lines.join("\n"));
  const rows = [{ text: header + copy.text, targets: copy.targets.map(target => ({ ...target, column: target.column + terminalCellWidth(header) })) }];
  const isLong = lines.length > PRISMANTIS_FOLD_THRESHOLD;
  const isFolded = isLong && !state.panel.rendered;
  const visibleLines = isFolded ? lines.slice(0, PRISMANTIS_FOLD_VISIBLE_LINES) : lines;
  const hasNumbers = lines.length >= PRISMANTIS_NUMBER_THRESHOLD && lines.length <= PRISMANTIS_NUMBER_MAXIMUM;
  const gutterWidth = String(visibleLines.length).length;
  for (let index = 0; index < visibleLines.length; index += 1) {
    const lineNumber = hasNumbers ? color(`${String(index + 1).padStart(gutterWidth)}  `, MOCHA_MUTED) : "";
    rows.push(plainRow("  " + lineNumber + prismantisCodeLine(visibleLines[index])));
  }
  if (isLong) rows.push(actionRow([{ label: isFolded ? `+${lines.length - PRISMANTIS_FOLD_VISIBLE_LINES} more lines` : "show less", action: { type: "render-toggle" } }]));
  return rows;
}

function tableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map(cell => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = tableCells(line);
  return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function renderPrismantisTable(lines: string[], columns: number): DemoRow[] {
  const cells = [tableCells(lines[0]), ...lines.slice(2).map(tableCells)];
  const columnCount = cells[0].length;
  const cellWidths: number[] = [];
  for (let column = 0; column < columnCount; column += 1) {
    let naturalWidth = 1;
    for (const row of cells) naturalWidth = Math.max(naturalWidth, terminalCellWidth(row[column] ?? ""));
    cellWidths.push(Math.min(naturalWidth, Math.max(1, Math.floor((columns - columnCount * 3 - 1) / columnCount))));
  }
  function border(left: string, fill: string, join: string, right: string): string {
    return left + cellWidths.map(width => fill.repeat(width + 2)).join(join) + right;
  }
  const asciiLines = [border("┌", "─", "┬", "┐")];
  const rows = [copyRow("⧉ md", "markdown", lines.join("\n"))];
  rows.push(plainRow(color(asciiLines[0], MOCHA_RULE)));
  for (let index = 0; index < cells.length; index += 1) {
    if (index > 0) {
      const separator = index === 1 ? border("╞", "═", "╪", "╡") : border("├", "─", "┼", "┤");
      rows.push(plainRow(color(separator, MOCHA_RULE)));
      asciiLines.push(separator);
    }
    const wrappedCells = cellWidths.map((width, column) => wrapTerminalText(cells[index][column] ?? "", width));
    const cellRows = Math.max(...wrappedCells.map(cell => cell.length));
    for (let rowIndex = 0; rowIndex < cellRows; rowIndex += 1) {
      let plain = "│";
      let styled = color("│", MOCHA_RULE);
      for (let column = 0; column < columnCount; column += 1) {
        const value = wrappedCells[column][rowIndex] ?? "";
        const padding = " ".repeat(Math.max(0, cellWidths[column] - terminalCellWidth(value)));
        plain += ` ${value}${padding} │`;
        styled += " " + color(value, index === 0 ? MOCHA_HEADING : "") + padding + color(" │", MOCHA_RULE);
      }
      asciiLines.push(plain);
      rows.push(plainRow(styled));
    }
  }
  const bottom = border("└", "─", "┴", "┘");
  rows.push(plainRow(color(bottom, MOCHA_RULE)));
  asciiLines.push(bottom);
  const art = copyRow("⧉ art", "art", asciiLines.join("\n"));
  rows[0] = { text: rows[0].text + " " + art.text, targets: [...rows[0].targets, ...art.targets.map(target => ({ ...target, column: target.column + terminalCellWidth(rows[0].text) + 1 }))] };
  return rows;
}

function renderPrismantisMarkdown(state: SimulationState, reply: string, columns: number): DemoRow[] {
  const sourceLines = reply.split("\n");
  const rows: DemoRow[] = [];
  let blocks = 0;
  for (let index = 0; index < sourceLines.length; index += 1) {
    const line = sourceLines[index];
    if (!line.trim()) { rows.push(plainRow("")); continue; }
    const fence = /^```([\w-]*)/.exec(line);
    if (fence) {
      const code: string[] = [];
      while (index + 1 < sourceLines.length && sourceLines[index + 1] !== "```") code.push(sourceLines[++index]);
      if (index + 1 < sourceLines.length) index += 1;
      rows.push(...renderPrismantisCode(state, code, fence[1]));
      blocks += 1;
      continue;
    }
    if (index + 1 < sourceLines.length && line.includes("|") && isTableSeparator(sourceLines[index + 1])) {
      const table = [line, sourceLines[++index]];
      while (index + 1 < sourceLines.length && sourceLines[index + 1].includes("|")) table.push(sourceLines[++index]);
      rows.push(...renderPrismantisTable(table, columns));
      blocks += 1;
      continue;
    }
    const heading = /^#{1,6}\s+(.+)/.exec(line);
    const paragraph = heading ? color(`━━ ${heading[1]} ━━`, MOCHA_HEADING) : line;
    for (const wrapped of wrapTerminalText(paragraph, columns)) rows.push(plainRow(wrapped));
    blocks += 1;
  }
  if (blocks > 1) rows.push(copyRow("⧉ copy reply", "text", reply));
  return rows;
}

function prismantisToolLabel(text: string): string {
  const label = text.replace(/^[◉✎●$]\s*/, "");
  if (label.startsWith("Edit ")) return "Edited " + label.slice(5);
  if (label.startsWith("Agent:")) return "Delegated" + label.slice(6);
  if (label.startsWith("npm ")) return "Ran " + label;
  return label;
}

export function renderPrismantisTranscriptEntry(entry: TranscriptEntry, state: SimulationState, columns: number): DemoRow[] {
  if (entry.role === "user") {
    const content = wrapTerminalText(entry.text, Math.max(1, columns - 4)).map(line => color(line, MOCHA_HEADING));
    const bubbleColumns = Math.min(columns, Math.max(4, ...content.map(line => terminalCellWidth(line) + 4)));
    return roundedBox(content, bubbleColumns, MOCHA_ACCENT);
  }
  if (entry.role === "assistant") {
    const rows = indentRows(renderPrismantisMarkdown(state, entry.text, Math.max(1, columns - 2)), 2);
    if (rows[0]) rows[0].text = color("●", MOCHA_ACCENT) + rows[0].text.slice(1);
    return clippedRows(rows, columns);
  }
  if (entry.role === "tool") {
    const label = prismantisToolLabel(entry.text);
    const chatColumns = Math.min(terminalCellWidth(label) + 2, Math.max(20, Math.floor(columns * 0.6)), columns);
    const fitted = fitText(label, Math.max(1, chatColumns - 2));
    const padding = " ".repeat(Math.max(0, columns - chatColumns));
    return [plainRow(padding + color(fitted, "2") + " " + color("●", MOCHA_NUMBER))];
  }
  return wrapTerminalText(entry.text, columns).map(line => plainRow(color(line, "2")));
}

function renderPrismantis(state: SimulationState, columns: number): DemoPanel {
  if (state.phase === "working" && state.tick < REPLY_TICK) return { rows: [] };
  const reply = currentReply(state);
  if (!reply) return { rows: [] };
  return { rows: renderPrismantisTranscriptEntry({ role: "assistant", turn: state.turn, text: reply }, state, columns) };
}

const FLIGHTDECK_MAIN = "38;2;215;119;87";
const FLIGHTDECK_AGENT = "38;2;137;180;250";

function flightdeckGauge(percent: number, width: number, tint: string): string {
  const filled = Math.max(0, Math.min(width, Math.round(percent / 100 * width)));
  return color("▰".repeat(filled), tint) + color("▱".repeat(width - filled), "2");
}

function agentStatus(state: SimulationState, doneTick: number): string {
  if (state.tick >= doneTick || state.phase === "complete") return color("✓ done", "2");
  return color("◐ running", FLIGHTDECK_AGENT);
}

function flightdeckAgentCards(state: SimulationState, columns: number): DemoRow[] {
  const cardColumns = Math.floor((columns - 1) / 2);
  const cards = [
    { title: "Explorer", task: "inspect the handler", type: "explore", doneTick: CHECK_TICK - 4, selection: 1 },
    { title: "Reviewer", task: "check the change", type: "review", doneTick: CHECK_TICK + 4, selection: 2 },
  ];
  const boxes: DemoRow[][] = [];
  for (const card of cards) {
    const width = columns >= 41 ? cardColumns : columns;
    const box = roundedBox([card.title, color(card.task, "1"), color(card.type, "2"), color("ctx 1.0k · out 0.2k · 2 st", "2"), agentStatus(state, card.doneTick)], width, FLIGHTDECK_AGENT);
    box[1].targets.push({ column: 3, width: Math.min(card.title.length, width - 4), action: { type: "select", index: card.selection }, key: String(card.selection) });
    boxes.push(box);
  }
  if (columns < 41) return [...boxes[0], ...boxes[1]];
  const joined: DemoRow[] = [];
  for (let index = 0; index < boxes[0].length; index += 1) {
    const left = boxes[0][index];
    const right = boxes[1][index];
    const leftWidth = terminalCellWidth(left.text);
    joined.push({ text: left.text + " ".repeat(Math.max(1, cardColumns + 1 - leftWidth)) + right.text, targets: [...left.targets, ...right.targets.map(target => ({ ...target, column: target.column + cardColumns + 1 }))] });
  }
  return joined;
}

function renderFlightdeck(state: SimulationState, columns: number): DemoPanel {
  const isWorking = state.phase === "working" || state.phase === "decision";
  const mainStatus = isWorking ? color("● working", FLIGHTDECK_MAIN) : color("○ idle", "2");
  const contextTint = state.usage.context >= 80 ? "31" : FLIGHTDECK_MAIN;
  const resetTurn = state.flightdeckResetTurn ?? 0;
  const hasTurn = state.turn > resetTurn;
  const hasAgents = hasTurn && (state.tick >= AGENT_TICK || state.phase === "complete");
  if (state.panel.tab === "mini") {
    const rows = [plainRow(color("Sonnet", "1;" + FLIGHTDECK_MAIN) + ` ${mainStatus} · ctx ${flightdeckGauge(state.usage.context, 6, contextTint)} ${state.usage.context}%` + color(` · $${state.usage.cost.toFixed(2)}`, "2"))];
    if (hasAgents) rows.push(targetedRow(`${agentStatus(state, CHECK_TICK - 4)} Explorer`, 1, columns), targetedRow(`${agentStatus(state, CHECK_TICK + 4)} Reviewer`, 2, columns));
    if (hasTurn && state.phase === "complete") rows.push(plainRow(color("last turn 24s · 2 agents · 1 edit · 0 errors", "2")));
    return { rows: clippedRows(rows, columns) };
  }
  const isWide = state.panel.tab === "wide" || state.panel.tab === "auto" && columns >= 110;
  const panelColumns = isWide ? Math.max(4, Math.floor((columns - 2) / 2)) : columns;
  const mainRows = roundedBox([
    color("Sonnet · main", "1;" + FLIGHTDECK_MAIN) + `  ${mainStatus}`,
    `effort ${color("▮▮▮▯ high", FLIGHTDECK_MAIN)}   mode default   ${state.turn - resetTurn} req`,
    `ctx ${flightdeckGauge(state.usage.context, 10, contextTint)} ${state.usage.context}%`,
    `$${state.usage.cost.toFixed(2)}   5h ${flightdeckGauge(state.usage.fiveHour, 5, FLIGHTDECK_MAIN)} ${state.usage.fiveHour}%  7d ${flightdeckGauge(state.usage.sevenDay, 5, FLIGHTDECK_MAIN)} ${state.usage.sevenDay}%`,
  ], panelColumns, FLIGHTDECK_MAIN);
  const agentRows: DemoRow[] = [];
  if (hasAgents) {
    agentRows.push(plainRow(color("agents", "1;" + FLIGHTDECK_AGENT) + color("  1-2 expand", "2")), plainRow(color("─".repeat(Math.max(1, Math.min(panelColumns, 66))), "2")));
    agentRows.push(...flightdeckAgentCards(state, panelColumns));
    if (state.panel.selection === 1) agentRows.push(...roundedBox(["Explorer", "task: inspect the handler and its imports", "Read src/app.ts", "Grep summarize"], panelColumns, FLIGHTDECK_AGENT));
    if (state.panel.selection === 2) agentRows.push(...roundedBox(["Reviewer", "task: check the change and its tests", "Read tests/app.test.ts", "Bash npm test"], panelColumns, FLIGHTDECK_AGENT));
  }
  if (hasTurn && isWorking) agentRows.push(...roundedBox([color(`◐ back to sonnet · turn ${Math.floor(state.tick * SIMULATION_TICK_MS / 1000)}s`, FLIGHTDECK_MAIN)], panelColumns, FLIGHTDECK_MAIN));
  if (hasTurn && state.phase === "complete") agentRows.push(...roundedBox([color("✓", "32") + ` last turn 24s · 2 agents · 1 edit · 0 errors · +$${(state.usage.cost - state.turnStartingUsage.cost).toFixed(2)}`], panelColumns, FLIGHTDECK_MAIN));
  const title = `FLIGHTDECK · SONNET ${isWorking ? "WORKS" : "IDLE"}`;
  const titlePadding = " ".repeat(Math.max(0, Math.floor((columns - title.length) / 2)));
  const rows: DemoRow[] = [plainRow(titlePadding + color(title, "1")), plainRow(color("■", FLIGHTDECK_MAIN) + color(" main  ", "2") + color("■", FLIGHTDECK_AGENT) + color(" agents  ", "2") + color("■", "32") + color(" gate", "2"))];
  if (isWide) {
    const count = Math.max(mainRows.length, agentRows.length);
    for (let index = 0; index < count; index += 1) {
      const left = mainRows[index] ?? plainRow("");
      const right = agentRows[index] ?? plainRow("");
      rows.push({ text: left.text + " ".repeat(Math.max(2, panelColumns + 2 - terminalCellWidth(left.text))) + right.text, targets: [...left.targets, ...right.targets.map(target => ({ ...target, column: target.column + panelColumns + 2 }))] });
    }
  } else rows.push(...mainRows, ...agentRows);
  rows.push(plainRow(""));
  const sessionRows = [color("session log", "2")];
  const toolEntries = state.transcript.filter(entry => entry.role === "tool" && (entry.id ?? 0) >= (state.flightdeckResetEntry ?? 0)).slice(-4);
  if (toolEntries.length === 0) sessionRows.push(color("nothing yet", "2"));
  for (const entry of toolEntries) sessionRows.push(color("main ", FLIGHTDECK_MAIN) + entry.text);
  rows.push(...roundedBox(sessionRows, columns, "2"));
  return { rows: clippedRows(rows, columns) };
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

function fileActivityTint(state: SimulationState, path: string): string {
  if (path !== "src/app.ts" || state.phase !== "working") return "";
  const activitySeconds = state.tick * SIMULATION_TICK_MS / 1000;
  const readSeconds = READ_TICK * SIMULATION_TICK_MS / 1000;
  const editSeconds = EDIT_TICK * SIMULATION_TICK_MS / 1000;
  if (activitySeconds >= editSeconds && activitySeconds - editSeconds < FILE_FLASH_SECONDS) return FILE_WRITE;
  if (activitySeconds >= readSeconds && activitySeconds - readSeconds < FILE_FLASH_SECONDS) return FILE_READ;
  return "";
}

function fileRow(state: SimulationState, file: FixtureFile, columns: number): DemoRow {
  const activityTint = fileActivityTint(state, file.path);
  const isModified = file.path === "src/app.ts" && (state.files.modified || state.tick >= EDIT_TICK);
  let tint = activityTint;
  if (!tint && isModified) tint = FILE_MODIFIED;
  if (!tint && file.hidden) tint = FILE_MUTED;
  let suffix = state.files.sizes ? file.size : "Oct 12";
  if (isModified) suffix = color("+8", FILE_ADDED) + " " + color("-2", FILE_DELETED) + " " + color("M", FILE_MODIFIED);
  const label = state.files.query ? `  · ${file.path}` : "  " + file.label;
  const padding = " ".repeat(Math.max(1, columns - terminalCellWidth(label) - terminalCellWidth(suffix)));
  let text = color(label, tint) + padding + color(suffix, isModified ? "" : FILE_MUTED);
  if (state.panel.selection === file.index) text = color(stripAnsi(text), FILE_SELECTED_BACKGROUND);
  return targetedRow(text, file.index, columns);
}

function renderFiletree(state: SimulationState, columns: number): DemoPanel {
  const hasEdit = state.files.modified || state.tick >= EDIT_TICK;
  if (state.files.atParent) return { rows: [plainRow(color("workspace", FILE_ACCENT)), plainRow(color("⑂ main clean", FILE_MUTED)), plainControlsRow([{ label: "▸ ■ modshelf-project", action: { type: "file-cwd" } }])] };
  const header = color("modshelf-project", "1;" + FILE_ACCENT);
  const controls = plainControlsRow([
    { label: "↑", action: { type: "file-up" } },
    { label: "⌂", action: { type: "file-cwd" } },
    { label: "↻", action: { type: "file-refresh" } },
    { label: state.files.hidden ? "◉" : "○", action: { type: "file-hidden" } },
    { label: "Σ", action: { type: "file-size" } },
    { label: "⊟", action: { type: "file-collapse" } },
  ]);
  const headerWidth = terminalCellWidth(header);
  const rows: DemoRow[] = [{ text: header + "  " + controls.text, targets: controls.targets.map(target => ({ ...target, column: target.column + headerWidth + 2 })) }];
  let branch = color("⑂ ", FILE_ACCENT) + color("main", "1");
  if (hasEdit) branch += " " + color("+8", FILE_ADDED) + " " + color("-2", FILE_DELETED) + " " + color("M:1", FILE_MODIFIED);
  else branch += color(" clean", FILE_MUTED);
  rows.push(plainRow(branch), plainRow(color(`/ ${state.files.query || "search"}`, FILE_MUTED)));
  const files = visibleFixtureFiles(state);
  let previousFolder = "";
  for (const file of files) {
    const folder = file.path.includes("/") ? file.path.split("/")[0] : "";
    if (folder && folder !== previousFolder && !state.files.query) rows.push(plainRow(color(`▾ ■ ${folder}`, FILE_ACCENT)));
    rows.push(fileRow(state, file, columns));
    previousFolder = folder;
  }
  if (state.files.collapsed && !state.files.query) rows.splice(3, 0, plainRow(color("▸ ■ src", FILE_ACCENT)), plainRow(color("▸ ■ tests", FILE_ACCENT)));
  if (files.length === 0) rows.push(plainRow(color("empty", FILE_MUTED)));
  const selected = FIXTURE_FILES.find(file => file.index === state.panel.selection);
  if (selected) rows.push(plainRow(""), plainRow(color(`selected: ${selected.path}`, FILE_MUTED)));
  return { rows: clippedRows(rows, columns) };
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
  if (prompts.length === 0) {
    if (!state.panel.vertical) return { rows: [] };
    return { rows: [plainRow(color(columns < 12 ? "·" : "No prompts yet", "2"))] };
  }
  let selection = prompts.length - 1;
  if (state.panel.selection >= 0) selection = Math.min(state.panel.selection, prompts.length - 1);
  const rows: DemoRow[] = [];
  if (state.panel.vertical) {
    for (let index = 0; index < prompts.length; index += 1) {
      const glyph = index === selection ? "━" : color("─", "2");
      const label = columns >= 12 ? ` ${glyph} ${prompts[index].text}` : ` ${glyph} `;
      rows.push(targetedRow(label, index, columns));
    }
  } else {
    const capacity = Math.max(1, columns - RAIL_INSET - 2);
    const hasOverflow = prompts.length > capacity;
    const shownCount = hasOverflow ? Math.max(1, capacity - 2) : prompts.length;
    const first = Math.min(Math.max(0, selection - Math.floor(shownCount / 2)), prompts.length - shownCount);
    rows.push(plainRow(color(`  #${selection + 1} ${prompts[selection].text}`, "2")));
    const ticks: DemoRow = { text: " ".repeat(RAIL_INSET), targets: [] };
    let column = RAIL_INSET + 1;
    if (hasOverflow) { ticks.text += color(first > 0 ? "‹" : " ", "2"); column += 1; }
    for (let index = first; index < first + shownCount; index += 1) {
      ticks.text += index === selection ? "┃" : color("│", "2");
      ticks.targets.push({ column, width: 1, action: { type: "select", index } });
      column += 1;
    }
    if (first + shownCount < prompts.length) ticks.text += color("›", "2");
    rows.push(ticks);
  }
  return { rows: clippedRows(rows, columns), status: `Prompt ${selection + 1} of ${prompts.length}` };
}

function renderPullRequest(state: SimulationState, columns: number): DemoPanel {
  const checksExpanded = state.panel.tab === "checks";
  const rows = [actionRow([{ label: "↻ refreshed 12:00", action: { type: "file-refresh" } }]), plainRow(""), plainRow("#42 PR OPEN"), plainRow(""), plainRow(color("Simplify the example request handler", "1")), plainRow("")];
  const checkControl = actionRow([{ label: checksExpanded ? "▼ checks" : "▶ checks", action: { type: "tab", value: checksExpanded ? "main" : "checks" } }]);
  rows.push({ ...checkControl, text: checkControl.text + " " + color("passing", "32") });
  if (checksExpanded) rows.push(plainRow("checks ✓2 · review APPROVED · merge MERGEABLE"), plainRow(color("✓ TypeScript", "32")), plainRow(color("✓ Unit tests", "32")));
  const firstParagraph = "This change makes the handler easier to read";
  const secondParagraph = "and adds tests for the empty-input case.";
  rows.push(plainRow(""), targetedRow(state.panel.selection === 1 ? color(firstParagraph, "7") : firstParagraph, 1, columns), targetedRow(state.panel.selection === 2 ? color(secondParagraph, "7") : secondParagraph, 2, columns), plainRow(""));
  if (state.review.quote || state.panel.selection > 0) {
    let quote = state.review.quote;
    if (!quote) quote = state.panel.selection === 1 ? firstParagraph : secondParagraph;
    rows.push(plainRow(color(`> ${quote}`, "2")), plainRow(`comment ${state.review.draft || "Enter adds it; empty Enter drops the selection"}`));
  }
  for (let index = 0; index < state.review.comments.length; index += 1) rows.push({ text: color("x", "2") + ` ${state.review.comments[index]}`, targets: [{ column: 1, width: 1, action: { type: "review-remove", index } }] });
  rows.push(plainRow(`overall ${state.review.quote || state.panel.selection > 0 ? "a comment on the whole entry" : state.review.draft || "a comment on the whole entry"}`));
  if (state.review.draft.trim()) rows.push(actionRow([{ label: "Add comment", action: { type: "review-add" } }]));
  const submit = actionRow([{ label: "Submit", action: { type: "review-submit" } }]);
  const count = state.review.comments.length;
  rows.push({ ...submit, text: submit.text + color(` ${count} ${count === 1 ? "comment" : "comments"}`, "2") });
  return { rows: clippedRows(rows, columns), status: "Submit feedback to Claude" };
}

type TasklinePhase = "running" | "stalled" | "done" | "error";
type TasklineFixture = { id: "demo-download" | "demo-scan" | "demo-stuck"; label: string; icon: string; phase: TasklinePhase; done: number; total: number | null; updatedAt: number; startedAt: number; bytes: number | null };
type TasklineDetail = { barWidth: number; unitWord: boolean; bytes: boolean; rate: boolean; eta: boolean; labelWidth: number; percentOnly: boolean };
const TASKLINE_DETAILS: TasklineDetail[] = [
  { barWidth: 20, unitWord: true, bytes: true, rate: true, eta: true, labelWidth: 32, percentOnly: false },
  { barWidth: 12, unitWord: true, bytes: true, rate: true, eta: true, labelWidth: 24, percentOnly: false },
  { barWidth: 10, unitWord: true, bytes: true, rate: false, eta: true, labelWidth: 20, percentOnly: false },
  { barWidth: 8, unitWord: false, bytes: false, rate: false, eta: true, labelWidth: 16, percentOnly: false },
  { barWidth: 6, unitWord: false, bytes: false, rate: false, eta: true, labelWidth: 14, percentOnly: true },
  { barWidth: 4, unitWord: false, bytes: false, rate: false, eta: true, labelWidth: 12, percentOnly: true },
  { barWidth: 0, unitWord: false, bytes: false, rate: false, eta: true, labelWidth: 10, percentOnly: true },
  { barWidth: 0, unitWord: false, bytes: false, rate: false, eta: false, labelWidth: 8, percentOnly: true },
  { barWidth: 0, unitWord: false, bytes: false, rate: false, eta: false, labelWidth: 3, percentOnly: true },
];
const TASKLINE_AUTO_SINGLE_DETAIL = 2;
const TASKLINE_FRACTIONS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];
const TASKLINE_SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function taskElapsedSeconds(state: SimulationState): number {
  return Math.max(0, (state.clockTick - state.taskStartedAt) * SIMULATION_TICK_MS / 1000);
}

function tasklineCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function tasklineDuration(seconds: number): string {
  const rounded = Math.round(Math.max(0, seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

function tasklinePercent(fraction: number): string {
  const percentage = Math.max(0, Math.min(1, fraction)) * 100;
  if (percentage > 0 && percentage < 10) return `${percentage.toFixed(1)}%`;
  if (percentage >= 99.5 && percentage < 100) return "99%";
  return `${Math.round(percentage)}%`;
}

function tasklineBar(fraction: number, width: number, tint: string): string {
  const eighths = Math.round(Math.max(0, Math.min(1, fraction)) * width * 8);
  const fullBlocks = Math.floor(eighths / 8);
  const partialBlock = TASKLINE_FRACTIONS[eighths % 8];
  const emptyBlocks = width - fullBlocks - (partialBlock ? 1 : 0);
  return color("█".repeat(fullBlocks) + partialBlock, tint) + color("░".repeat(Math.max(0, emptyBlocks)), "2");
}

const TASK_RATE_TIME_CONSTANT_SECONDS = 20;

function tasklineDownloadFraction(updatedAt: number): number {
  const fraction = Math.min(1, updatedAt / TASK_DOWNLOAD_SECONDS);
  return Math.min(1, fraction + 0.03 * Math.sin(updatedAt * 1000 / 1500) * (1 - fraction) * fraction);
}

function tasklineMeasuredValue(task: TasklineFixture, updatedAt: number): number {
  if (task.id === "demo-download") return Math.round(TASK_DOWNLOAD_BYTES * tasklineDownloadFraction(updatedAt));
  return Math.round(updatedAt * 1000 / 7);
}

function tasklineRate(task: TasklineFixture): number | null {
  if (task.updatedAt < TASK_SOURCE_UPDATE_SECONDS) return null;
  let previousValue = tasklineMeasuredValue(task, TASK_SOURCE_UPDATE_SECONDS);
  let smoothedRate: number | null = null;
  const weight = 1 - Math.exp(-TASK_SOURCE_UPDATE_SECONDS / TASK_RATE_TIME_CONSTANT_SECONDS);
  for (let updatedAt = TASK_SOURCE_UPDATE_SECONDS * 2; updatedAt <= task.updatedAt; updatedAt += TASK_SOURCE_UPDATE_SECONDS) {
    const value = tasklineMeasuredValue(task, updatedAt);
    const rate = (value - previousValue) / TASK_SOURCE_UPDATE_SECONDS;
    smoothedRate = smoothedRate === null ? rate : weight * rate + (1 - weight) * smoothedRate;
    previousValue = value;
  }
  if (smoothedRate !== null && smoothedRate > 0) return smoothedRate;
  return tasklineMeasuredValue(task, task.updatedAt) / task.updatedAt;
}

function tasklineFixtures(elapsed: number): TasklineFixture[] {
  const updatedAt = Math.min(TASK_DEMO_WRITER_SECONDS, Math.floor(elapsed / TASK_SOURCE_UPDATE_SECONDS) * TASK_SOURCE_UPDATE_SECONDS);
  const wobble = tasklineDownloadFraction(updatedAt);
  const bridgeDone = Math.round(TASK_DOWNLOAD_FILES * Math.min(1, wobble));
  let tilesPhase: TasklinePhase = "stalled";
  let tilesUpdatedAt = -TASK_STALLED_AGE_SECONDS;
  if (elapsed >= TASK_ERROR_SECONDS) { tilesPhase = "error"; tilesUpdatedAt = TASK_ERROR_SECONDS; }
  const bridgePhase = elapsed >= TASK_DOWNLOAD_SECONDS ? "done" : "running";
  const indexPhase = elapsed >= TASK_INDEX_SECONDS ? "done" : "running";
  const tasks: TasklineFixture[] = [
    { id: "demo-stuck", label: "Tiles", icon: "⬇", phase: tilesPhase, done: TASK_STALLED_FILES, total: TASK_STALLED_TOTAL, startedAt: -600, updatedAt: tilesUpdatedAt, bytes: null },
    { id: "demo-download", label: "Bridge", icon: "⬇", phase: bridgePhase, done: bridgeDone, total: TASK_DOWNLOAD_FILES, startedAt: 0, updatedAt, bytes: Math.round(TASK_DOWNLOAD_BYTES * Math.min(1, wobble)) },
    { id: "demo-scan", label: "Index", icon: "🔍", phase: indexPhase, done: Math.round(updatedAt * 1000 / 7), total: null, startedAt: 0, updatedAt, bytes: null },
  ];
  if (elapsed < TASK_SOURCE_UPDATE_SECONDS) return [tasks[0]];
  if (bridgePhase === "done" && indexPhase === "running") return [tasks[0], tasks[2], tasks[1]];
  return tasks;
}

function wasTasklineFinishedAt(task: TasklineFixture, elapsed: number): boolean {
  if (task.id === "demo-download") return elapsed >= TASK_DOWNLOAD_SECONDS;
  if (task.id === "demo-scan") return elapsed >= TASK_INDEX_SECONDS;
  return elapsed >= TASK_ERROR_SECONDS;
}

function isTasklineVisible(task: TasklineFixture, elapsed: number, state: SimulationState): boolean {
  for (const removal of state.taskRemoved ?? []) {
    if (removal.id !== task.id) continue;
    const removedAt = (removal.tick - state.taskStartedAt) * SIMULATION_TICK_MS / 1000;
    if (task.updatedAt <= removedAt) return false;
  }
  if (task.phase === "done" && elapsed - task.updatedAt >= TASK_DONE_RETENTION_SECONDS) return false;
  if (task.phase === "error" && elapsed - task.updatedAt >= TASK_ERROR_RETENTION_SECONDS) return false;
  if (state.taskClearTick == null) return !state.tasksCleared;
  const clearedAt = Math.max(0, (state.taskClearTick - state.taskStartedAt) * SIMULATION_TICK_MS / 1000);
  const wasFinished = wasTasklineFinishedAt(task, clearedAt);
  if (!wasFinished && task.id !== "demo-stuck") return true;
  if (!state.taskClearAll && !wasFinished) return true;
  return task.updatedAt > clearedAt;
}

function tasklineCounter(task: TasklineFixture, detail: TasklineDetail): string {
  if (task.total === null) {
    const count = tasklineCount(task.done);
    if (detail.unitWord) return count + " items";
    return count;
  }
  if (detail.percentOnly) return tasklinePercent(task.done / task.total);
  const count = `${tasklineCount(task.done)}/${tasklineCount(task.total)}`;
  if (detail.unitWord) return count + " files";
  return count;
}

function tasklineBytes(value: number): string {
  if (value < 1000) return `${Math.round(value)} B`;
  if (value < 1e6) return `${(value / 1000).toFixed(1)} KB`;
  if (value < 1e9) return `${(value / 1e6).toFixed(1)} MB`;
  return `${(value / 1e9).toFixed(1)} GB`;
}

function tasklineTaskText(task: TasklineFixture, detail: TasklineDetail, elapsed: number): string {
  const iconTint = task.phase === "error" ? TASK_ERROR : TASK_RUNNING;
  let text = color(task.icon, iconTint) + " " + color(fitText(task.label, detail.labelWidth), "1");
  if (task.phase === "error") {
    text += " " + color("✖", TASK_ERROR);
    if (detail.labelWidth > 3) text += color(" " + fitText("HTTP 503 from tile server", Math.max(8, detail.labelWidth * 2)), TASK_ERROR);
    return text;
  }
  if (task.phase === "done") {
    text += " " + color("✔", TASK_DONE);
    if (detail.labelWidth > 3) {
      if (task.total !== null && !detail.percentOnly) {
        let counter = ` ${tasklineCount(Math.max(task.done, task.total))}/${tasklineCount(task.total)}`;
        if (detail.unitWord) counter += " files";
        text += color(counter, TASK_DONE);
      }
      if (detail.eta) text += color(` in ${tasklineDuration(task.updatedAt - task.startedAt)}`, "2");
    }
    return text;
  }
  const tone = task.phase === "stalled" ? TASK_STALLED : TASK_RUNNING;
  if (task.total === null) {
    const spinner = TASKLINE_SPINNER[Math.floor(elapsed * 1000 / 125) % TASKLINE_SPINNER.length];
    text += " " + color(spinner, tone) + " " + tasklineCounter(task, detail);
  } else {
    if (detail.barWidth > 0) text += " " + tasklineBar(task.done / task.total, detail.barWidth, tone);
    const counter = tasklineCounter(task, detail);
    text += " " + counter;
  }
  if (task.phase === "stalled") {
    const age = Math.floor((elapsed - task.updatedAt) / 60);
    text += color(" · ", "2") + color(`⏸ stalled ${age}m`, TASK_STALLED);
    return text;
  }
  if (detail.bytes && task.bytes !== null) text += color(` · ${tasklineBytes(task.bytes)}/${tasklineBytes(TASK_DOWNLOAD_BYTES)}`, "2");
  if (detail.rate && task.updatedAt > 0) {
    const measuredRate = tasklineRate(task);
    if (measuredRate !== null) {
      const rate = task.bytes === null ? `${Math.round(measuredRate)}/s` : `${(measuredRate / 1e6).toFixed(1)} MB/s`;
      text += color(` · ${rate}`, "2");
    }
  }
  if (detail.eta && task.total !== null && task.done > 0) {
    const measuredRate = tasklineRate(task);
    if (measuredRate !== null && measuredRate > 0) {
      const remainingValue = task.bytes === null ? task.total - task.done : TASK_DOWNLOAD_BYTES - task.bytes;
      const remaining = Math.max(0, remainingValue / measuredRate - (elapsed - task.updatedAt));
      text += color(" · ", "2") + `ETA ${tasklineDuration(remaining)}`;
    }
  }
  return text;
}

function fitTasklineTask(task: TasklineFixture, columns: number, elapsed: number): string {
  for (const detail of TASKLINE_DETAILS) {
    const text = tasklineTaskText(task, detail, elapsed);
    if (terminalCellWidth(text) <= columns) return text;
  }
  return fitText(tasklineTaskText(task, TASKLINE_DETAILS[TASKLINE_DETAILS.length - 1], elapsed), columns);
}

function singleTasklineRow(tasks: TasklineFixture[], columns: number, elapsed: number, maxDetail: number, allowHidden: boolean): DemoRow | null {
  for (let count = tasks.length; count >= 1; count -= 1) {
    if (!allowHidden && count < tasks.length) break;
    for (let detail = 0; detail <= maxDetail; detail += 1) {
      const parts: string[] = [];
      for (const task of tasks.slice(0, count)) parts.push(tasklineTaskText(task, TASKLINE_DETAILS[detail], elapsed));
      if (count < tasks.length) parts.push(color(`+${tasks.length - count} more`, "2"));
      const text = parts.join(color(" │ ", "2"));
      if (terminalCellWidth(text) <= columns) return plainRow(text);
    }
  }
  return null;
}

type TasklineCelebration = { label: string; startedAt: number; endsAt: number };

function tasklineCelebrations(state: SimulationState): TasklineCelebration[] {
  const events = [
    { label: "Bridge", startedAt: TASK_DOWNLOAD_SECONDS * 1000 },
    { label: "Index", startedAt: TASK_INDEX_SECONDS * 1000 },
  ];
  for (const tick of state.taskCheckTicks ?? []) {
    events.push({ label: "taskline", startedAt: (tick - state.taskStartedAt) * SIMULATION_TICK_MS });
  }
  events.sort((first, second) => first.startedAt - second.startedAt);
  const scheduled: TasklineCelebration[] = [];
  for (const event of events) {
    let waiting = 0;
    for (const celebration of scheduled) {
      if (celebration.startedAt > event.startedAt) waiting += 1;
    }
    if (waiting >= TASK_CELEBRATION_QUEUE_LIMIT) continue;
    const previousEnd = scheduled[scheduled.length - 1]?.endsAt ?? 0;
    const startedAt = Math.max(event.startedAt, previousEnd);
    scheduled.push({ ...event, startedAt, endsAt: startedAt + TASK_CELEBRATION_SECONDS * 1000 });
  }
  return scheduled;
}

function tasklineCelebration(state: SimulationState, columns: number): DemoRow[] {
  const now = (state.clockTick - state.taskStartedAt) * SIMULATION_TICK_MS;
  for (const celebration of tasklineCelebrations(state)) {
    if (now < celebration.startedAt || now >= celebration.endsAt) continue;
    return [plainRow(fitText(color("✔ CHECK!!", "1;" + TASK_DONE) + color(`  ${celebration.label}`, "2"), columns))];
  }
  return [];
}

function renderTaskline(state: SimulationState, columns: number): DemoPanel {
  if (columns < 4) return { rows: [] };
  const elapsed = taskElapsedSeconds(state);
  const tasks = tasklineFixtures(elapsed).filter(task => isTasklineVisible(task, elapsed, state));
  const celebration = tasklineCelebration(state, columns);
  if (tasks.length === 0) return { rows: celebration };
  if (state.panel.tab === "single") {
    const row = singleTasklineRow(tasks, columns, elapsed, TASKLINE_DETAILS.length - 1, true);
    return { rows: [...celebration, row ?? plainRow(color(fitText(`+${tasks.length} more`, columns), "2"))] };
  }
  if (state.panel.tab !== "stacked" && !state.panel.vertical) {
    const row = singleTasklineRow(tasks, columns, elapsed, TASKLINE_AUTO_SINGLE_DETAIL, false);
    if (row) return { rows: [...celebration, row] };
  }
  return { rows: [...celebration, ...tasks.map(task => plainRow(fitTasklineTask(task, columns, elapsed)))] };
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
