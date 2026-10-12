import type { DemoAction, DemoPanel, DemoRow, SimulationState } from "./demo-types.ts";
import { getDemoDefinition, renderDemoPanel } from "./demo-registry.ts";
import { color, fitText, plainRow, stripAnsi, terminalCellWidth, wrapTerminalText } from "./demo-render.ts";
import { REPLY_TICK } from "./demo-config.ts";
import { finalReply } from "./mod-simulation.ts";
import { renderPrismantisTranscriptEntry } from "./demo-views/panes.ts";
import { mindfulSpinnerMessage } from "./demo-views/core.ts";
import { renderMermaidTranscriptEntry } from "./demo-views/hooks.ts";
import type { TranscriptEntry } from "./demo-types.ts";

export type FrameTarget = { row: number; column: number; width: number; action: DemoAction; key?: string };
export type PanelRectangle = { row: number; column: number; width: number; height: number };
export type DemoTerminalFrame = { lines: string[]; targets: FrameTarget[]; graphic?: DemoPanel["graphic"]; rectangle?: PanelRectangle; status: string };
const MIN_DOCK_COLUMNS = 110;
const MAX_PANE_COLUMNS = 55;

function selectedPromptEntries(entries: TranscriptEntry[], selection: number): TranscriptEntry[] {
  const prompts = entries.filter(entry => entry.role === "user");
  const selected = prompts[selection];
  if (!selected) return entries;
  const selectedIndex = entries.indexOf(selected);
  const nextPrompt = prompts[selection + 1];
  const endIndex = nextPrompt ? entries.indexOf(nextPrompt) : entries.length;
  return entries.slice(selectedIndex, endIndex);
}

function transcriptRows(state: SimulationState, columns: number): DemoRow[] {
  const rows: DemoRow[] = [];
  let entries = state.transcript;
  if (state.modId === "prompt-rail" && state.panel.selection >= 0) {
    entries = selectedPromptEntries(entries, state.panel.selection);
  }
  for (const entry of entries) {
    if (state.modId === "mermaid-draw" && entry.role === "assistant") {
      rows.push(...renderMermaidTranscriptEntry(entry.text, state, columns), plainRow(""));
      continue;
    }
    if (state.modId === "prismantis") {
      if (entry.role === "assistant" && entry.turn === state.turn && state.phase === "complete") continue;
      rows.push(...renderPrismantisTranscriptEntry(entry, state, columns), plainRow(""));
      continue;
    }
    let marker = color("·", "2");
    if (entry.role === "user") marker = color("❯", "37");
    if (entry.role === "assistant") marker = color("●", "32");
    for (const [index, line] of wrapTerminalText(entry.text, columns - 3).entries()) rows.push(plainRow(`${index === 0 ? marker : " "} ${entry.role === "tool" || entry.role === "system" ? color(line, "2") : line}`));
    rows.push(plainRow(""));
  }
  if (state.phase === "working") {
    const frames = ["✻", "✽", "✶", "✳"];
    let label = state.tick >= REPLY_TICK ? "Writing a reply…" : "Working…";
    if (state.modId === "mindful-claude") label = mindfulSpinnerMessage(state) ?? label;
    rows.push(plainRow(color(`${frames[state.clockTick % frames.length]} ${label} (${Math.floor(state.tick * 0.4)}s)`, "33")));
    if (state.tick >= REPLY_TICK && state.modId !== "prismantis" && state.modId !== "mermaid-draw") {
      const reply = finalReply(state);
      const visibleCharacters = Math.ceil(reply.length * (state.tick - REPLY_TICK + 1) / 8);
      for (const line of wrapTerminalText(reply.slice(0, visibleCharacters), columns - 3)) rows.push(plainRow(color("●", "32") + " " + line));
    }
  }
  if (state.phase === "decision") rows.push(plainRow(color("◆ Waiting for your decision", "33")));
  if (state.phase === "complete") rows.push(plainRow(color("✻ Worked for 24s", "2")));
  return rows;
}

function padLine(text: string, columns: number): string {
  const clipped = fitText(text, columns);
  return clipped + " ".repeat(Math.max(0, columns - terminalCellWidth(clipped)));
}

function addTargets(targets: FrameTarget[], row: DemoRow, rowNumber: number, columnOffset: number, width: number) {
  for (const target of row.targets) {
    if (target.column + target.width - 1 <= width) targets.push({ ...target, row: rowNumber, column: target.column + columnOffset });
  }
}

function visualSimulationState(state: SimulationState, reducedMotion: boolean): SimulationState {
  if (!reducedMotion) return state;
  if (state.modId === "mindful-claude") return { ...state, tick: 0, clockTick: 0 };
  if (state.modId === "clawd-buddy") return { ...state, clockTick: 0 };
  return state;
}

export function buildDemoTerminalFrame(state: SimulationState, columns: number, height: number, reducedMotion = false): DemoTerminalFrame {
  const definition = getDemoDefinition(state.modId);
  let placement = definition.placement;
  if (state.modId === "prompt-rail" && state.panel.vertical) placement = "right-pane";
  if (state.panel.open && (state.modId === "quota-meter" || state.modId === "token-ledger")) placement = "right-pane";
  const dock = columns >= MIN_DOCK_COLUMNS && (placement === "right-pane" || placement === "gate");
  const paneColumns = dock ? Math.min(MAX_PANE_COLUMNS, Math.floor(columns * 0.43)) : columns;
  const panel = renderDemoPanel(visualSimulationState(state, reducedMotion), paneColumns);
  const header = [plainRow(color("Claude Code", "1") + color("  / modshelf-project", "2")), plainRow(""), plainRow("")];
  let transcript = transcriptRows(state, dock && panel.rows.length ? columns - paneColumns - 3 : columns);
  let panelRows = panel.rows;
  if (state.modId === "mermaid-draw" && state.phase === "complete") panelRows = [];
  if (placement === "transcript" && panelRows.length) {
    if (state.phase === "complete" && state.modId !== "prismantis") {
      const lastAssistant = transcript.findLastIndex(row => stripAnsi(row.text).startsWith("●"));
      if (lastAssistant >= 0) transcript = transcript.slice(0, lastAssistant);
    }
    transcript = [...transcript, ...panelRows]; panelRows = [];
  }
  const targets: FrameTarget[] = [];
  const lines = header.map(row => fitText(row.text, columns));
  const bandRows = (panel.bandRows ?? []).slice(0, Math.max(0, height - header.length - 5));
  const availableHeight = Math.max(1, height - header.length - bandRows.length);
  let rectangle: PanelRectangle | undefined;
  if (dock && panelRows.length) {
    const transcriptColumns = columns - paneColumns - 3;
    const visibleTranscript = transcript.slice(-availableHeight);
    const visiblePanel = panelRows.slice(0, availableHeight);
    for (let rowIndex = 0; rowIndex < availableHeight; rowIndex += 1) {
      const left = visibleTranscript[rowIndex] ?? plainRow("");
      const right = visiblePanel[rowIndex] ?? plainRow("");
      lines.push(`${padLine(left.text, transcriptColumns)} ${color("│", "2")} ${fitText(right.text, paneColumns)}`);
      addTargets(targets, left, header.length + rowIndex + 1, 0, transcriptColumns);
      addTargets(targets, right, header.length + rowIndex + 1, transcriptColumns + 3, paneColumns);
    }
    rectangle = { row: header.length + 1 + (panel.graphicOffset ?? 2), column: transcriptColumns + 4, width: Math.min(panel.graphicWidth ?? paneColumns, paneColumns), height: Math.min(panel.graphicHeight ?? 8, availableHeight - (panel.graphicOffset ?? 2)) };
  } else {
    const panelHeight = Math.min(panelRows.length, Math.max(0, availableHeight - 5));
    const transcriptHeight = availableHeight - panelHeight;
    const visibleTranscript = transcript.slice(-transcriptHeight);
    for (const row of visibleTranscript) { lines.push(fitText(row.text, columns)); addTargets(targets, row, lines.length, 0, columns); }
    while (lines.length < header.length + transcriptHeight) lines.push("");
    const panelStart = lines.length;
    for (const row of panelRows.slice(0, panelHeight)) { lines.push(fitText(row.text, columns)); addTargets(targets, row, lines.length, 0, columns); }
    if (panelHeight) rectangle = { row: panelStart + 1 + (panel.graphicOffset ?? 1), column: 1, width: Math.min(panel.graphicWidth ?? columns, columns), height: Math.min(panel.graphicHeight ?? 8, panelHeight - (panel.graphicOffset ?? 1)) };
  }
  for (const row of bandRows) {
    lines.push(fitText(row.text, columns));
    addTargets(targets, row, lines.length, 0, columns);
  }
  while (lines.length < height) lines.push("");
  return { lines, targets, graphic: panel.graphic, rectangle, status: panel.status ?? "" };
}

export function paintDemoTerminalFrame(frame: DemoTerminalFrame, previous?: DemoTerminalFrame, reportMouse = true): string {
  let output = previous ? "" : "\u001b[?1049h\u001b[?7l\u001b[2J";
  for (let rowIndex = 0; rowIndex < frame.lines.length; rowIndex += 1) {
    if (previous?.lines[rowIndex] === frame.lines[rowIndex]) continue;
    output += `\u001b[${rowIndex + 1};1H\u001b[2K${frame.lines[rowIndex]}`;
  }
  const mouseMode = reportMouse ? "\u001b[?1000h\u001b[?1006h" : "\u001b[?1000l\u001b[?1006l";
  return output + "\u001b[?25l" + mouseMode;
}

export function findDemoAction(frame: DemoTerminalFrame, column: number, row: number): DemoAction | null {
  const target = frame.targets.find(item => item.row === row && column >= item.column && column < item.column + item.width);
  return target?.action ?? null;
}
