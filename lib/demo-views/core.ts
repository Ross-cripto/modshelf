import { buildBoardLines } from "../arcade-terminal.ts";
import { AGENT_TICK, CHECK_TICK, DINO_LEFT_COLUMN, EDIT_TICK, READ_TICK, REPLY_TICK, SIMULATION_TICK_MS } from "../demo-config.ts";
import { actionRow, color, fitText, plainRow, stripAnsi, terminalCellWidth } from "../demo-render.ts";
import type { DemoButton, DemoDefinition, DemoPanel, DemoRow, SimulationState } from "../demo-types.ts";

const CONTEXT_WINDOW_TOKENS = 200_000;
const TOKENS_PER_CONTEXT_PERCENT = CONTEXT_WINDOW_TOKENS / 100;
const CONTEXT_HISTORY_LIMIT = 24;
const CONTEXT_GROWTH_SAMPLE_LIMIT = 5;
const CONTEXT_STATUS_LIMIT = 70;
const BREATH_ART_ROWS = 7;
const BREATH_PROGRESS_MAX = 1000;
const BREATH_STYLE_NAMES = ["pulse", "ripples", "dots", "wave"] as const;
const FLOW_BACKGROUND = "48;2;21;24;30";
const FLOW_NODE_WIDTH = 32;
const FLOW_PHASE_GAP = 7;
const MASCOT_BODY = "38;2;215;119;87";
const MASCOT_ARM = "38;2;169;87;60";
const PULSE_COLOR = "38;2;247;131;93";
const CLOSED_PANEL: DemoPanel = { rows: [] };
const CCTOP_TABS: DemoButton[] = [
  { label: "Coach", action: { type: "tab", value: "Coach" } },
  { label: "Overview", action: { type: "tab", value: "Overview" } },
  { label: "Tools", action: { type: "tab", value: "Tools" } },
  { label: "Agents", action: { type: "tab", value: "Agents" } },
  { label: "Files", action: { type: "tab", value: "Files" } },
  { label: "Events", action: { type: "tab", value: "Events" } },
  { label: "Advisor", action: { type: "tab", value: "Advisor" } },
];

export const CORE_DEMOS: DemoDefinition[] = [
  {
    id: "cc-arcade", placement: "above-prompt", startupCommand: "/arcade 2048", startsOpen: true, initialTab: "2048",
    example: "Inspect the project and add a small improvement.",
    instructions: "Send a message, then click the board and play with the arrow keys or WASD while Claude works. Escape returns to your message.",
    limitation: "A local recreation of cc-arcade’s 2048 board and turn-completion banner. Its other games are not included. Claude’s tools and reply are simulated.",
    source: "https://github.com/sezaakgun/cc-arcade/tree/0baff06d31295850283c2eebe052f39bbc35473f/hooks",
    controls: [
      { label: "←", action: { type: "arcade-move", direction: "left" } },
      { label: "↑", action: { type: "arcade-move", direction: "up" } },
      { label: "↓", action: { type: "arcade-move", direction: "down" } },
      { label: "→", action: { type: "arcade-move", direction: "right" } },
      { label: "New game", action: { type: "game-restart" } },
      { label: "Open / close", action: { type: "toggle" } },
    ],
  },
  {
    id: "cctop", placement: "right-pane", startupCommand: "/cctop-pane overview", startsOpen: true, initialTab: "Overview",
    example: "Read the app, inspect its tools, and make a focused change.",
    instructions: "Send a message and follow the session in cctop’s tabs. Click any Overview metric to open its detail.",
    limitation: "Native pane, tabs, metric selection, and work events are recreated with local project and usage fixtures. No account telemetry or advisor model is called.",
    source: "https://github.com/tomstagl/cctop/tree/6ceafc34a972f4e58d5e53b1c69f80e2a9759d41",
    controls: [...CCTOP_TABS, { label: "Open / close", action: { type: "toggle" } }],
  },
  {
    id: "flowpane", placement: "right-pane", startupCommand: "/flowpane", startsOpen: false, initialTab: "workflow",
    example: "Research the app and its tests in parallel, then implement an improvement.",
    instructions: "Use /flowpane to open the pane, then send a message. Select an agent to inspect its Prompt, Tool Calls, Thinking, or Response. The layout settings change the graph.",
    limitation: "A three-agent fixture follows the phase barrier and retains the finished graph. Nested workflows, graph scrolling, theme switching, and the native settings dialog are not reproduced.",
    source: "https://github.com/mpolatcan/flowpane/tree/2450ad4c8cabd693cfb64f9b96937d07c59f6225/hooks",
    controls: [
      { label: "Workflow", action: { type: "tab", value: "workflow" } },
      { label: "Agent detail", action: { type: "tab", value: "details" } },
      { label: "Open / close", action: { type: "toggle" } },
    ],
  },
  {
    id: "mindful-claude", placement: "above-prompt", startupCommand: "", startsOpen: true, initialTab: "hrv:random",
    example: "Take a careful look at this project and suggest an improvement.",
    instructions: "Send a message to start breathing. /breathe selects hrv, sigh, box, or 478; style selects pulse, ripples, dots, wave, or random. Delay and spinner settings follow the native commands.",
    limitation: "All four native exercises and art styles run on the browser’s 400ms clock. Random style uses a repeatable cycle; the native renderer updates every 100ms.",
    source: "https://github.com/halluton/Mindful-Claude/tree/411c9c4f4f1c3d128159be7315823341ae7d9e2d/hooks",
    controls: [{ label: "Enable / disable", action: { type: "toggle" } }],
  },
  {
    id: "context-lens", placement: "right-pane", startupCommand: "", startsOpen: false, initialTab: "summary",
    example: "Read the project and explain how its main feature works.",
    instructions: "Send a message to receive the first context reading. Open the pane for categories, then send another message to see growth. Compact starts a fresh measurement.",
    limitation: "Readings use completed-turn fixtures. Supplied category, window, model, and compaction metadata are drawn as reported; missing metadata uses the native total-only fallback. Refresh remains a fixture without a token-count request.",
    source: "https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/context-lens/hooks/register.tsx",
    controls: [
      { label: "Open / close pane", action: { type: "toggle" } },
      { label: "Compact context", action: { type: "compact" } },
    ],
  },
  {
    id: "cc-dino", placement: "above-prompt", startupCommand: "/dino", startsOpen: true, initialTab: "dino",
    example: "Explore the project and run its checks.",
    instructions: "Click the game and use Space or ↑ to jump, ↓ to duck, p to pause, and r to start a run. Completion pauses the game. /dino reset clears the record.",
    limitation: "Native sprites, obstacle kinds, ducking, night, record, and completion behavior use a deterministic browser run. The 400ms clock and jump arc differ from the original 33ms physics.",
    source: "https://github.com/manfye/cc-dino/tree/2d0221b6650ebe6287114cf9deec13b0b30850ec/hooks",
    controls: [
      { label: "Jump", action: { type: "dino-jump" } },
      { label: "Pause / resume", action: { type: "pause" } },
      { label: "New run", action: { type: "game-restart" } },
      { label: "Open / close", action: { type: "toggle" } },
    ],
  },
  {
    id: "clawd-buddy", placement: "above-prompt", startupCommand: "", startsOpen: true, initialTab: "auto",
    example: "Read the project, make a small edit, and check the result.",
    instructions: "Send a message and watch Clawd react to thinking, reading, editing, and completion. The mascot stays quietly above your prompt.",
    limitation: "A small local selection of terminal poses follows simulated session events. Clawd’s full animation library, desktop surface, and companion integrations are not executed.",
    source: "https://github.com/FynnXland/fynn-mods/tree/4498aa6ce4b10006e6daf4f02bd6c3412afb308c/mods/clawd-buddy/hooks",
    controls: [{ label: "Show / hide Clawd", action: { type: "toggle" } }],
  },
];

function clippedRow(text: string, columns: number): DemoRow {
  return plainRow(fitText(text, columns));
}

function centerText(text: string, columns: number): string {
  const length = terminalCellWidth(text);
  return " ".repeat(Math.max(0, Math.floor((columns - length) / 2))) + text;
}

function compactTokens(tokens: number): string {
  if (tokens < 1000) return String(Math.round(tokens));
  return `${(tokens / 1000).toFixed(1)}k`;
}

function renderArcade(state: SimulationState, columns: number): DemoPanel {
  if (state.panel.tab === "games") {
    return { rows: [
      clippedRow(color("arcade · click a game · /arcade <game> works too · /arcade stop closes", "2"), columns),
      actionRow([{ label: "2048", action: { type: "tab", value: "2048" } }, { label: "close", action: { type: "close" } }]),
    ] };
  }
  const rows: DemoRow[] = [actionRow([
    { label: "← games", action: { type: "tab", value: "games" } },
    { label: "close", action: { type: "close" } },
  ])];
  for (const line of buildBoardLines(state.arcade.game)) rows.push(plainRow(line));
  let status = `2048 · score ${state.arcade.game.score}`;
  if (state.arcade.game.over) status = `2048 · no moves left · score ${state.arcade.game.score} · r plays again`;
  else {
    if (state.arcade.game.won) status += " · 2048 reached, keep going";
    status += " · click here, then arrows or wasd · r restarts";
  }
  status += ` · best ${state.arcade.bestScore}`;
  if (state.phase === "complete") status = color(`● Claude is done · ${status}`, "1;33");
  else status = color(status, "2");
  rows.push(clippedRow(status, columns));
  return { rows };
}

function getFixtureToolCount(state: SimulationState): number {
  let count = 0;
  for (const entry of state.transcript) {
    if (entry.role === "tool") count += 1;
  }
  return count;
}

function getWorkLabel(state: SimulationState): string {
  if (state.phase === "decision") return "waiting for permission";
  if (state.phase !== "working") return "idle";
  if (state.tick < READ_TICK) return "thinking";
  if (state.tick < AGENT_TICK) return "reading files";
  if (state.tick < EDIT_TICK) return "researching with agents";
  if (state.tick < CHECK_TICK) return "editing src/app.ts";
  if (state.tick < REPLY_TICK) return "running checks";
  return "writing reply";
}

function nativeActionRows(buttons: DemoButton[], columns: number, active = "", lead = ""): DemoRow[] {
  const rows: DemoRow[] = [];
  let text = lead;
  let used = terminalCellWidth(lead);
  let targets: DemoRow["targets"] = [];
  for (const button of buttons) {
    const selected = button.label.toLowerCase() === active.toLowerCase();
    const label = selected ? ` ${button.label} ` : button.label;
    const width = terminalCellWidth(label);
    let gap = used > 0 ? 2 : 0;
    if (used + gap + width > columns && used > 0) {
      rows.push({ text, targets });
      text = "";
      targets = [];
      used = 0;
      gap = 0;
    }
    text += " ".repeat(gap);
    if (selected) text += color(label, "7");
    else {
      text += label;
      targets.push({ column: used + gap + 1, width, action: button.action, key: button.key });
    }
    used += gap + width;
  }
  if (used > 0) rows.push({ text, targets });
  return rows;
}

function nativeFrame(title: string, summary: string, body: DemoRow[], columns: number, hotkey = ""): DemoRow[] {
  let heading = title;
  if (hotkey) heading = `${hotkey} ${heading}`;
  if (summary) heading += ` ─ ${summary}`;
  const clippedHeading = stripAnsi(fitText(heading, columns - 3));
  const top = `╭${clippedHeading} ${"─".repeat(Math.max(0, columns - terminalCellWidth(clippedHeading) - 3))}╮`;
  const rows = [plainRow(color(top, "2"))];
  for (const row of body) {
    const content = fitText(row.text, columns - 4);
    const padding = " ".repeat(Math.max(0, columns - terminalCellWidth(content) - 4));
    rows.push({ text: color("│ ", "2") + content + padding + color(" │", "2"), targets: row.targets.map(target => ({ ...target, column: target.column + 2 })) });
  }
  rows.push(plainRow(color(`╰${"─".repeat(columns - 2)}╯`, "2")));
  return rows;
}

function cctopGauge(percent: number, width: number): string {
  const filled = Math.max(0, Math.min(width, Math.round(percent / 100 * width)));
  let ansi = "32";
  if (percent >= 90) ansi = "31";
  else if (percent >= 70) ansi = "33";
  return color("▇".repeat(filled), ansi) + color("▁".repeat(width - filled), "2");
}

function cctopMetricDetail(state: SimulationState, columns: number): DemoRow[] {
  const usage = state.usage;
  switch (state.panel.selection) {
    case 0:
      return [plainRow(color("Context window", "1")), clippedRow(`  ${cctopGauge(usage.context, Math.min(28, columns - 15))} ${usage.context}%`, columns), clippedRow(`  size ${compactTokens(usage.context * TOKENS_PER_CONTEXT_PERCENT)} · 200k window`, columns)];
    case 1:
      return [plainRow(color("Rate limits", "1")), clippedRow(`  5h ${cctopGauge(usage.fiveHour, 12)} ${usage.fiveHour}%`, columns), clippedRow(`  7d ${cctopGauge(usage.sevenDay, 12)} ${usage.sevenDay}%`, columns), clippedRow(color("  resets in 2h40", "2"), columns)];
    case 2:
      return [plainRow(color("Cache TTL", "1")), clippedRow("  5m ≈ left of a 5m entry", columns), clippedRow(`  cached ${compactTokens(usage.cached)} tokens`, columns), clippedRow(color("  TTL 5m (observed)", "2"), columns)];
    case 3:
      return [plainRow(color("Session spend", "1")), clippedRow(`  $${usage.cost.toFixed(3)} total`, columns), clippedRow(`  ${compactTokens(usage.input)} in · ${compactTokens(usage.output)} out`, columns)];
    case 4:
      return [plainRow(color("Check / rework", "1")), clippedRow(state.tick >= CHECK_TICK ? "  ✓ check passed · rework 0 open" : "  ✓ none · rework 0 open", columns)];
    case 5:
      return cctopTools(state, columns, false);
    default:
      return [plainRow(color("Recent events", "1")), clippedRow(state.turn === 0 ? "  no events yet" : `  turn ${state.turn} · ${getWorkLabel(state)}`, columns)];
  }
}

function cctopOverview(state: SimulationState, columns: number): DemoRow[] {
  const usage = state.usage;
  let phase = "○ IDLE";
  let phaseColor = "2";
  if (state.phase === "working") { phase = "● BUSY"; phaseColor = "32"; }
  else if (state.phase === "decision") { phase = "◆ WAITING"; phaseColor = "33"; }
  const header = ` cctop  Sonnet 5 · turn ${state.turn}`;
  const phaseWidth = terminalCellWidth(phase) + 1;
  const headerText = fitText(header, Math.max(1, columns - phaseWidth - 1));
  const gap = " ".repeat(Math.max(1, columns - terminalCellWidth(headerText) - phaseWidth));
  const rows: DemoRow[] = [plainRow(headerText + gap + color(phase, phaseColor))];
  const cells = [
    { label: `ctx ${usage.context}%`, index: 0 }, { label: `5h ${usage.fiveHour}%`, index: 1 },
    { label: "cache 5m≈", index: 2 }, { label: `spend $${usage.cost.toFixed(2)}`, index: 3 },
    { label: state.tick >= CHECK_TICK ? "✓ passed" : "✓ none", index: 4 }, { label: `${getFixtureToolCount(state)} calls 0 err`, index: 5 },
  ];
  const cellsPerRow = columns >= 80 ? 3 : 2;
  const cellWidth = Math.floor((columns - 2) / cellsPerRow);
  for (let start = 0; start < cells.length; start += cellsPerRow) {
    let text = " ";
    const targets: DemoRow["targets"] = [];
    for (let offset = 0; offset < cellsPerRow && start + offset < cells.length; offset += 1) {
      const cell = cells[start + offset];
      const label = fitText(`${cell.index + 1}: ${cell.label}`, cellWidth - 1);
      const padded = label + " ".repeat(Math.max(0, cellWidth - terminalCellWidth(label)));
      if (cell.index === state.panel.selection) text += color(padded, "1;32");
      else {
        text += padded;
        targets.push({ column: 2 + offset * cellWidth, width: cellWidth, action: { type: "select", index: cell.index }, key: String(cell.index + 1) });
      }
    }
    rows.push({ text, targets });
  }
  rows.push({ text: fitText(color(` ▸ ${getWorkLabel(state)}`, "33"), columns), targets: [{ column: 2, width: columns - 2, action: { type: "tab", value: "Advisor" }, key: "a" }] });
  const detail = cctopMetricDetail(state, columns);
  const title = stripAnsi(detail[0].text);
  const home = "0: home";
  const prefix = `─── ${title} `;
  let rule = color(prefix + "─".repeat(Math.max(1, columns - terminalCellWidth(prefix) - home.length - 1)), "2") + home;
  rule = fitText(rule, columns);
  rows.push({ text: rule, targets: [{ column: Math.max(1, columns - home.length + 1), width: home.length, action: { type: "select", index: -1 }, key: "0" }] });
  rows.push(...detail.slice(1));
  return rows;
}

type CctopTool = { name: string; calls: number };
function cctopToolCounts(state: SimulationState): CctopTool[] {
  const tools: CctopTool[] = [];
  for (const entry of state.transcript) {
    if (entry.role !== "tool") continue;
    const name = entry.text.split(/[ :]/)[0];
    const existing = tools.find(tool => tool.name === name);
    if (existing) existing.calls += 1;
    else tools.push({ name, calls: 1 });
  }
  return tools;
}

function cctopTools(state: SimulationState, columns: number, framed = true): DemoRow[] {
  const tools = cctopToolCounts(state);
  const body = [clippedRow(color("TOOL         CALL ERR    P50    P95   →CTX", "2"), columns - 4)];
  for (const tool of tools) body.push(clippedRow(`${tool.name.padEnd(12)} ${String(tool.calls).padStart(4)}   0  400ms  400ms   1.2k≈`, columns - 4));
  if (tools.length === 0) body.push(plainRow("no tool calls yet"));
  if (!framed) return [plainRow(color("Calls / errors", "1")), ...body];
  return nativeFrame("Tools", `${getFixtureToolCount(state)} calls`, body, columns, "5");
}

function cctopBody(state: SimulationState, columns: number): DemoRow[] {
  const tab = state.panel.tab.toLowerCase();
  if (tab.startsWith("coach")) {
    const body = [plainRow("quiet · nothing to act on"), clippedRow(`○ context  ${state.usage.context}%`, columns - 4), plainRow("○ cache    5m≈"), clippedRow(`○ limits   ${state.usage.fiveHour}%`, columns - 4), plainRow("○ rework   0 open"), plainRow("next     —"), plainRow("snoozed  —")];
    return nativeFrame("Coach", "quiet", body, columns);
  }
  if (tab === "tools") return cctopTools(state, columns);
  if (tab === "agents") {
    const body: DemoRow[] = [clippedRow(color("STATE      TIME  TOKENS COST  WASTE", "2"), columns - 4)];
    if (state.tick < AGENT_TICK && state.completed.length === 0) body.push(plainRow("no subagents yet"));
    else {
      const mark = state.tick >= EDIT_TICK || state.phase === "complete" ? "✓" : "◐";
      body.push(clippedRow(`${mark} researcher  4.0s   2.4k 0.01  0.00`, columns - 4));
      body.push(clippedRow(`${mark} researcher  4.0s   1.8k 0.01  0.00`, columns - 4));
      if (state.tick >= EDIT_TICK || state.phase === "complete") body.push(clippedRow(`${state.phase === "complete" ? "✓" : "◐"} implementer 8.0s 3.2k 0.02 0.00`, columns - 4));
    }
    return nativeFrame("Agents & MCP", "", body, columns, "6");
  }
  if (tab === "files") {
    const body = [clippedRow(color("FILE            TOUCHES     +    −", "2"), columns - 4)];
    if (state.tick < READ_TICK && state.completed.length === 0) body.push(plainRow("no files touched yet"));
    else {
      body.push(clippedRow(state.tick >= EDIT_TICK ? "src/app.ts      R×1 E×1     +8   −2" : "src/app.ts      R×1", columns - 4));
      body.push(clippedRow("tests/app.test.ts R×1", columns - 4));
    }
    return nativeFrame("Files", state.tick >= READ_TICK ? "2 touched" : "0 touched", body, columns, "7");
  }
  if (tab === "events") {
    const body: DemoRow[] = [];
    for (const entry of state.transcript) {
      if (entry.role === "tool") body.push(clippedRow(`${String(entry.turn).padStart(2, "0")}:00:00 ${color("tool", "32")} ${entry.text}`, columns - 4));
    }
    if (body.length === 0) body.push(plainRow("no events yet"));
    return nativeFrame("Events", String(body.length), body, columns, "8");
  }
  if (tab === "advisor") return nativeFrame("Advisor", "", [plainRow("Read before editing; check after."), plainRow("no pending action")], columns, "9");
  return cctopOverview(state, columns);
}

function renderCctop(state: SimulationState, columns: number): DemoPanel {
  const rows = nativeActionRows(CCTOP_TABS, columns, state.panel.tab, color("cctop", "1"));
  rows.push(...cctopBody(state, columns));
  return { rows };
}

type FlowAgent = { name: string; phase: number; startTick: number; finishTick: number; tokens: number; task: string; tool: string; result: string };
const FLOW_AGENTS: FlowAgent[] = [
  { name: "researcher · UI", phase: 1, startTick: AGENT_TICK, finishTick: EDIT_TICK, tokens: 2400, task: "Inspect the app and identify a focused improvement.", tool: "Read src/app.ts", result: "Found the main feature and its entry point." },
  { name: "researcher · tests", phase: 1, startTick: AGENT_TICK, finishTick: EDIT_TICK, tokens: 1800, task: "Inspect the tests and identify the relevant checks.", tool: "Read tests/app.test.ts", result: "Identified the checks for the proposed edit." },
  { name: "implementer", phase: 2, startTick: EDIT_TICK, finishTick: REPLY_TICK, tokens: 3200, task: "Apply a focused change and verify the result.", tool: "Edit src/app.ts", result: "Applied the fixture edit and passed the checks." },
];
const FLOW_COLOR = {
  text: "38;2;223;227;234", dim: "38;2;123;132;146", running: "38;2;242;179;61",
  done: "38;2;76;195;138", stopped: "38;2;167;174;187", wire: "38;2;122;162;247", boundary: "38;2;46;52;64",
};
const FLOW_SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function flowTurn(state: SimulationState): number | null {
  let turn: number | null = null;
  for (const entry of state.transcript) {
    if (entry.role === "tool" && entry.text.startsWith("Workflow")) turn = entry.turn;
  }
  return turn;
}

function flowTick(state: SimulationState): number {
  const lastTurn = flowTurn(state);
  if (state.flowRun?.turn === lastTurn) return state.flowRun.tick;
  if (lastTurn !== null && lastTurn < state.turn) return REPLY_TICK;
  return state.tick;
}

function flowAgentState(state: SimulationState, agent: FlowAgent): { label: string; mark: string; ansi: string } {
  const tick = flowTick(state);
  const phase = state.flowRun?.phase ?? state.phase;
  if (tick >= agent.finishTick || phase === "complete") return { label: "done", mark: "✔", ansi: FLOW_COLOR.done };
  if (phase === "stopped") return { label: "stopped", mark: "⊘", ansi: FLOW_COLOR.stopped };
  return { label: "running", mark: FLOW_SPINNER[state.clockTick % FLOW_SPINNER.length], ansi: FLOW_COLOR.running };
}

function centeredRule(label: string, columns: number, left = "", right = "", ansi = FLOW_COLOR.boundary): string {
  const available = Math.max(0, columns - terminalCellWidth(left) - terminalCellWidth(right));
  const clipped = stripAnsi(fitText(label, available));
  const gap = Math.max(0, available - terminalCellWidth(clipped));
  const before = Math.floor(gap / 2);
  return color(left + "─".repeat(before) + clipped + "─".repeat(gap - before) + right, ansi);
}

function flowNode(state: SimulationState, agent: FlowAgent, index: number, columns: number): DemoRow[] {
  const width = Math.min(FLOW_NODE_WIDTH, columns);
  const status = flowAgentState(state, agent);
  const label = ` ${status.mark} ${agent.name} `;
  const labelWidth = Math.min(width - 2, terminalCellWidth(label));
  const before = Math.floor((width - 2 - labelWidth) / 2);
  const after = width - 2 - labelWidth - before;
  const heading = ` ${color(status.mark, status.ansi)} ${color(agent.name, FLOW_COLOR.text)} `;
  const top = color("╭" + "─".repeat(before), status.ansi) + fitText(heading, labelWidth) + color("─".repeat(after) + "╮", status.ansi);
  const elapsedTick = Math.max(0, Math.min(flowTick(state), agent.finishTick) - agent.startTick);
  const seconds = (elapsedTick * SIMULATION_TICK_MS / 1000).toFixed(1);
  const tokens = status.label === "done" ? compactTokens(agent.tokens) : "—";
  const facts = stripAnsi(fitText(`⧖ ${seconds}s  ∑ ${tokens}`, width - 4));
  const centered = centerText(facts, width - 2);
  const body = color("│", status.ansi) + color(centered.padEnd(width - 2), FLOW_COLOR.text) + color("│", status.ansi);
  const bottom = centeredRule(" Sonnet 5 ", width, "╰", "╯", status.ansi);
  return [
    { text: top, targets: [{ column: 1, width, action: { type: "select", index } }] },
    plainRow(body), plainRow(bottom),
  ];
}

function flowPhaseRows(state: SimulationState, phase: number, columns: number): DemoRow[] {
  const name = phase === 1 ? "Research" : "Implement";
  const total = phase === 1 ? 2 : 1;
  let finished = 0;
  for (const agent of FLOW_AGENTS) {
    if (agent.phase === phase && flowAgentState(state, agent).label === "done") finished += 1;
  }
  const rows = [plainRow(centeredRule(` ${name} ${finished}/${total} `, columns))];
  for (let index = 0; index < FLOW_AGENTS.length; index += 1) {
    const agent = FLOW_AGENTS[index];
    if (agent.phase !== phase || flowTick(state) < agent.startTick) continue;
    rows.push(...flowNode(state, agent, index, columns), plainRow(" "));
  }
  return rows;
}

function joinFlowPhases(left: DemoRow[], right: DemoRow[], columns: number): DemoRow[] {
  const rows: DemoRow[] = [];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const leftRow = left[index] ?? plainRow(" ");
    const rightRow = right[index] ?? plainRow(" ");
    const leftText = fitText(leftRow.text, FLOW_NODE_WIDTH);
    const padding = " ".repeat(Math.max(0, FLOW_NODE_WIDTH - terminalCellWidth(leftText)));
    let connector = " ".repeat(FLOW_PHASE_GAP);
    if (index === 3) connector = color("──────▶", FLOW_COLOR.wire);
    const text = fitText(leftText + padding + connector + rightRow.text, columns);
    const targets: DemoRow["targets"] = [];
    for (const target of leftRow.targets) {
      const width = Math.min(target.width, columns - target.column + 1);
      if (width > 0) targets.push({ ...target, width });
    }
    for (const target of rightRow.targets) {
      const column = target.column + FLOW_NODE_WIDTH + FLOW_PHASE_GAP;
      const width = Math.min(target.width, columns - column + 1);
      if (width > 0) targets.push({ ...target, column, width });
    }
    rows.push({ text, targets });
  }
  return rows;
}

function flowTimelineRows(state: SimulationState, columns: number): DemoRow[] {
  const labelWidth = Math.min(24, Math.floor(columns / 2));
  const axisWidth = Math.max(4, columns - labelWidth - 2);
  const duration = REPLY_TICK - AGENT_TICK;
  const seconds = duration * SIMULATION_TICK_MS / 1000;
  const rows = [clippedRow(" ".repeat(labelWidth) + `0s${" ".repeat(Math.max(0, axisWidth - 7))}${seconds.toFixed(1)}s`, columns), clippedRow(" ".repeat(labelWidth) + color("┬" + "─".repeat(axisWidth - 2) + "┬", FLOW_COLOR.boundary), columns)];
  for (const phase of [1, 2]) {
    rows.push(plainRow(centeredRule(phase === 1 ? " Research " : " Implement ", columns)));
    for (let index = 0; index < FLOW_AGENTS.length; index += 1) {
      const agent = FLOW_AGENTS[index];
      if (agent.phase !== phase || flowTick(state) < agent.startTick) continue;
      const status = flowAgentState(state, agent);
      const start = Math.floor((agent.startTick - AGENT_TICK) / duration * axisWidth);
      const endTick = Math.min(flowTick(state), agent.finishTick);
      const length = Math.max(1, Math.floor((endTick - agent.startTick) / duration * axisWidth));
      const label = fitText(`${status.mark} ${agent.name}`, labelWidth);
      const padding = " ".repeat(Math.max(0, labelWidth - terminalCellWidth(label)));
      const text = fitText(color(label, FLOW_COLOR.text) + padding + " " + " ".repeat(start) + color("━".repeat(length), status.ansi), columns);
      rows.push({ text, targets: [{ column: 1, width: columns, action: { type: "select", index } }] });
    }
  }
  return rows;
}

function flowHeader(state: SimulationState, columns: number): DemoRow[] {
  const rows: DemoRow[] = [];
  if (columns >= 46) rows.push(clippedRow(color(centerText("FlowPane - Dynamic Workflow Visualizer", columns), FLOW_COLOR.dim), columns));
  rows.push(plainRow(centeredRule("", columns)));
  if (flowTurn(state) === null) rows.push(clippedRow(color("▮ flowpane │ nothing running", FLOW_COLOR.text), columns));
  else {
    let finished = 0;
    let running = 0;
    for (const agent of FLOW_AGENTS) {
      if (flowTick(state) < agent.startTick) continue;
      const status = flowAgentState(state, agent);
      if (status.label === "done") finished += 1;
      if (status.label === "running") running += 1;
    }
    let summary = `✔ ${finished}/3`;
    if ((state.flowRun?.phase ?? state.phase) === "stopped") summary = `stopped ${finished}/3`;
    else if (running > 0) summary += ` │ ▸ ${running} running`;
    rows.push(clippedRow(color(`▮ demo │ ${summary}`, FLOW_COLOR.text), columns));
  }
  rows.push(plainRow(centeredRule("", columns)));
  return rows;
}

function flowFooter(columns: number): DemoRow[] {
  return nativeActionRows([
    { label: "⚙ Settings", action: { type: "tab", value: "settings" } },
    { label: "flowpane 0.10.0", action: { type: "tab", value: "about" } },
  ], columns);
}

function renderFlowGraph(state: SimulationState, columns: number): DemoPanel {
  const rows = flowHeader(state, columns);
  if (flowTurn(state) === null) {
    rows.push(plainRow(" "), clippedRow("  No workflow has run in this session yet.", columns), plainRow(" "), clippedRow("  Start one and its graph draws itself here as it goes.", columns));
    rows.push(...flowFooter(columns));
    return { rows };
  }
  if (state.panel.tab === "flow-timeline") rows.push(...flowTimelineRows(state, columns));
  else if (state.panel.tab === "flow-list") {
    for (const phase of [1, 2]) {
      rows.push(plainRow(centeredRule(phase === 1 ? " Research " : " Implement ", columns)));
      for (let index = 0; index < FLOW_AGENTS.length; index += 1) {
        const agent = FLOW_AGENTS[index];
        if (agent.phase !== phase || flowTick(state) < agent.startTick) continue;
        const status = flowAgentState(state, agent);
        const label = `▌${status.mark} ${agent.name}  ∑ ${compactTokens(agent.tokens)}  Sonnet 5`;
        rows.push({ text: fitText(color(label, status.ansi), columns), targets: [{ column: 1, width: columns, action: { type: "select", index } }] });
      }
    }
  } else if (state.panel.tab === "flow-horizontal" || (state.panel.tab === "workflow" && columns >= FLOW_NODE_WIDTH * 2 + FLOW_PHASE_GAP)) {
    rows.push(...joinFlowPhases(flowPhaseRows(state, 1, FLOW_NODE_WIDTH), flowPhaseRows(state, 2, FLOW_NODE_WIDTH), columns));
  } else {
    rows.push(...flowPhaseRows(state, 1, columns));
    if (flowTick(state) >= EDIT_TICK) rows.push(plainRow(color(centerText("└───────┬───────┘", columns), FLOW_COLOR.wire)), plainRow(color(centerText("▼", columns), FLOW_COLOR.wire)));
    rows.push(...flowPhaseRows(state, 2, columns));
  }
  rows.push(...flowFooter(columns));
  return { rows };
}

function flowDetailRows(state: SimulationState, columns: number): DemoRow[] {
  const selection = Math.min(FLOW_AGENTS.length - 1, Math.max(0, state.panel.selection));
  const agent = FLOW_AGENTS[selection];
  const status = flowAgentState(state, agent);
  const selectedTab = state.panel.tab.split(":")[1] ?? "Prompt";
  const tabLabels = ["Prompt", "Tool Calls", "Thinking", "Response"];
  const buttons: DemoButton[] = [];
  for (const label of tabLabels) buttons.push({ label, action: { type: "tab", value: `details:${label}` } });
  const rows: DemoRow[] = [];
  const title = centeredRule(` ${status.mark} ${agent.name} `, columns, "╭", "✕╮", status.ansi);
  rows.push({ text: title, targets: [{ column: columns - 2, width: 2, action: { type: "tab", value: state.flowLayout ?? "workflow" }, key: "Escape" }] });
  for (const row of nativeActionRows(buttons, columns - 4, selectedTab)) {
    const content = fitText(row.text, columns - 4);
    const padding = " ".repeat(Math.max(0, columns - 4 - terminalCellWidth(content)));
    rows.push({ text: color("│ ", FLOW_COLOR.boundary) + content + padding + color(" │", FLOW_COLOR.boundary), targets: row.targets.map(target => ({ ...target, column: target.column + 2 })) });
  }
  rows.push(plainRow(centeredRule("", columns, "├", "┤")));
  if (selectedTab === "Prompt") rows.push(flowDetailLine(agent.task, columns));
  else if (selectedTab === "Tool Calls") rows.push(flowDetailLine(`${status.label === "done" ? "✔" : "◌"} ${agent.tool}  ⧖ 400ms  ∑ 120 tkns`, columns));
  else if (selectedTab === "Thinking") rows.push(flowDetailLine("Inspect the relevant files before changing them.", columns));
  else if (status.label === "done") rows.push(flowDetailLine(agent.result, columns));
  else rows.push(flowDetailLine(color("No response yet.", FLOW_COLOR.dim), columns));
  rows.push(plainRow(centeredRule("", columns, "├", "┤")));
  rows.push(flowDetailLine(`${agent.phase === 1 ? "Research" : "Implement"} │ ∑ ${compactTokens(agent.tokens)} │ Sonnet 5`, columns));
  rows.push(plainRow(centeredRule("", columns, "╰", "╯")));
  return rows;
}

function flowDetailLine(text: string, columns: number): DemoRow {
  const content = fitText(text, columns - 4);
  const padding = " ".repeat(Math.max(0, columns - 4 - terminalCellWidth(content)));
  return plainRow(color("│ ", FLOW_COLOR.boundary) + content + padding + color(" │", FLOW_COLOR.boundary));
}

function renderFlowDetail(state: SimulationState, columns: number): DemoPanel {
  const graphState = { ...state, panel: { ...state.panel, tab: state.flowLayout ?? "workflow" } };
  const graph = renderFlowGraph(graphState, columns);
  const headerRows = flowHeader(state, columns).length;
  const rows = graph.rows.map((row, index) => {
    if (index < headerRows) return plainRow(row.text);
    return plainRow(color(stripAnsi(row.text), "2"));
  });
  const dialogWidth = Math.max(24, Math.min(80, columns - 4));
  const left = Math.max(0, Math.floor((columns - dialogWidth) / 2));
  const top = headerRows + 1;
  const dialog = flowDetailRows(state, dialogWidth);
  for (let index = 0; index < dialog.length; index += 1) {
    const background = stripAnsi(rows[top + index]?.text ?? " ").padEnd(columns);
    const dialogRow = dialog[index];
    const dialogText = fitText(dialogRow.text, dialogWidth);
    const padding = " ".repeat(Math.max(0, dialogWidth - terminalCellWidth(dialogText)));
    const before = color(background.slice(0, left), "2");
    const after = color(background.slice(left + dialogWidth), "2");
    rows[top + index] = { text: before + dialogText + padding + after, targets: dialogRow.targets.map(target => ({ ...target, column: target.column + left })) };
  }
  return { rows };
}

function renderFlowpane(state: SimulationState, columns: number): DemoPanel {
  if (state.panel.tab.startsWith("details")) return renderFlowDetail(state, columns);
  if (state.panel.tab === "settings") {
    const rows = flowHeader(state, columns);
    rows.push(plainRow(centeredRule(" Settings ", columns, "╭", "╮")));
    rows.push(...nativeActionRows([
      { label: "Horizontal", action: { type: "tab", value: "flow-horizontal" } },
      { label: "Vertical", action: { type: "tab", value: "flow-vertical" } },
      { label: "Timeline", action: { type: "tab", value: "flow-timeline" } },
      { label: "List", action: { type: "tab", value: "flow-list" } },
      { label: "Fits the shape", action: { type: "tab", value: "workflow" } },
      { label: "✕", action: { type: "tab", value: "workflow" } },
    ], columns));
    rows.push(plainRow(centeredRule(" Tokyo Night ", columns, "╰", "╯")));
    return { rows };
  }
  if (state.panel.tab === "about") {
    return { rows: [...flowHeader(state, columns), plainRow("flowpane 0.10.0"), clippedRow("Dynamic Workflow Visualizer", columns), clippedRow("github.com/mpolatcan/flowpane", columns), ...nativeActionRows([{ label: "✕", action: { type: "tab", value: "workflow" } }], columns)] };
  }
  return renderFlowGraph(state, columns);
}

type BreathStyle = "pulse" | "ripples" | "dots" | "wave";
type BreathExercise = { key: string; name: string; inhaleMs: number; holdMs: number; exhaleMs: number; restMs: number; sip: boolean };
type BreathPhase = { label: string; remainingMs: number; progress: number };
const BREATH_EXERCISES: BreathExercise[] = [
  { key: "hrv", name: "Coherent Breathing", inhaleMs: 5500, holdMs: 0, exhaleMs: 5500, restMs: 0, sip: false },
  { key: "sigh", name: "Physiological Sigh", inhaleMs: 4000, holdMs: 1000, exhaleMs: 10000, restMs: 0, sip: true },
  { key: "box", name: "Box Breathing", inhaleMs: 4000, holdMs: 4000, exhaleMs: 4000, restMs: 4000, sip: false },
  { key: "478", name: "4-7-8 Breathing", inhaleMs: 4000, holdMs: 7000, exhaleMs: 8000, restMs: 0, sip: false },
];
const BREATH_DOTS: readonly (readonly [number, number])[] = [
  [3, 0], [3, 70], [3, -80], [2, 150], [4, -160], [2, -220], [4, 230], [3, 300], [3, -310],
  [1, 250], [5, -260], [1, -400], [5, 410], [2, 450], [4, -460], [2, -530], [4, 540], [3, 600], [3, -620],
  [0, 400], [6, -420], [0, -600], [6, 620], [1, 700], [5, -710], [1, -800], [5, 810], [2, 850], [4, -860],
  [0, 900], [6, -910], [0, -950], [6, 960],
];

function breathSettings(state: SimulationState): { exercise: BreathExercise; style: BreathStyle } {
  const [exerciseName, styleName] = state.panel.tab.split(":");
  const exercise = BREATH_EXERCISES.find(candidate => candidate.key === exerciseName) ?? BREATH_EXERCISES[0];
  let style: BreathStyle = BREATH_STYLE_NAMES[Math.max(0, state.turn - 1) % BREATH_STYLE_NAMES.length];
  if (styleName === "pulse" || styleName === "ripples" || styleName === "dots" || styleName === "wave") style = styleName;
  return { exercise, style };
}

function easeBreath(progress: number): number {
  const scaled = Math.floor(progress * BREATH_PROGRESS_MAX);
  return Math.floor(scaled * (2 * BREATH_PROGRESS_MAX - scaled) / BREATH_PROGRESS_MAX);
}

function breathPhase(state: SimulationState, exercise: BreathExercise): BreathPhase {
  const cycleMs = exercise.inhaleMs + exercise.holdMs + exercise.exhaleMs + exercise.restMs;
  const elapsedMs = state.tick * SIMULATION_TICK_MS % cycleMs;
  const holdEnd = exercise.inhaleMs + exercise.holdMs;
  const exhaleEnd = holdEnd + exercise.exhaleMs;
  if (elapsedMs < exercise.inhaleMs) {
    let progress = easeBreath(elapsedMs / exercise.inhaleMs);
    if (exercise.sip) progress = Math.floor(progress * 850 / BREATH_PROGRESS_MAX);
    return { label: "Breathe in", remainingMs: exercise.inhaleMs - elapsedMs, progress };
  }
  if (elapsedMs < holdEnd) {
    if (exercise.sip) {
      const progress = 850 + Math.floor(easeBreath((elapsedMs - exercise.inhaleMs) / exercise.holdMs) * 150 / BREATH_PROGRESS_MAX);
      return { label: "Sip in", remainingMs: holdEnd - elapsedMs, progress };
    }
    return { label: "Hold", remainingMs: holdEnd - elapsedMs, progress: BREATH_PROGRESS_MAX };
  }
  if (elapsedMs < exhaleEnd) {
    return { label: "Breathe out", remainingMs: exhaleEnd - elapsedMs, progress: BREATH_PROGRESS_MAX - easeBreath((elapsedMs - holdEnd) / exercise.exhaleMs) };
  }
  return { label: "Hold", remainingMs: cycleMs - elapsedMs, progress: 0 };
}

function isBreathingVisible(state: SimulationState): boolean {
  return state.panel.open && state.phase === "working" && state.tick * SIMULATION_TICK_MS >= state.mindful.delaySeconds * 1000;
}

export function mindfulSpinnerMessage(state: SimulationState): string | null {
  if (!state.mindful.spinner || !isBreathingVisible(state)) return null;
  const { exercise } = breathSettings(state);
  const phase = breathPhase(state, exercise);
  return `${phase.label} ${Math.ceil(phase.remainingMs / 1000)}s`;
}

function shadedPulse(halfWidth: number): string {
  if (halfWidth <= 0) return "";
  const fade = ["▓", "▒▓", "░▒▓"];
  const edge = fade[Math.min(halfWidth, 3) - 1];
  const fill = "█".repeat(Math.max(0, halfWidth - 3));
  return edge + fill + fill + Array.from(edge).reverse().join("");
}

function placeBreathText(grid: string[][], row: number, text: string): void {
  const characters = Array.from(text);
  const left = Math.floor((grid[row].length - characters.length) / 2);
  for (let index = 0; index < characters.length; index += 1) {
    const column = left + index;
    if (column >= 0 && column < grid[row].length) grid[row][column] = characters[index];
  }
}

function breathArt(style: BreathStyle, progress: number, columns: number): string[] {
  const grid = Array.from({ length: BREATH_ART_ROWS }, () => Array<string>(columns).fill(" "));
  const maximumHalf = Math.floor(Math.min(60, Math.max(4, columns - 4)) / 2);
  let half = Math.floor(maximumHalf * progress / BREATH_PROGRESS_MAX);
  if (half < 1 && progress > 0) half = 1;
  if (style === "pulse") {
    const ratios = [200, 600, 1000, 600, 200];
    for (let index = 0; index < ratios.length; index += 1) placeBreathText(grid, index + 1, shadedPulse(Math.floor(half * ratios[index] / BREATH_PROGRESS_MAX)));
  } else if (style === "ripples") {
    const ratios = [1000, 750, 500, 250];
    const strokes = ["━", "─", "╌", "┈"];
    for (let distance = 0; distance < ratios.length; distance += 1) {
      const line = strokes[distance].repeat(Math.floor(half * ratios[distance] / BREATH_PROGRESS_MAX) * 2);
      placeBreathText(grid, 3 - distance, line);
      if (distance > 0) placeBreathText(grid, 3 + distance, line);
    }
  } else if (style === "dots") {
    for (const [row, offset] of BREATH_DOTS) {
      const distance = Math.abs(offset);
      if (distance > progress || progress <= 0) continue;
      const column = Math.floor(columns / 2) + Math.trunc(offset * maximumHalf / BREATH_PROGRESS_MAX);
      let glyph = "·";
      if (distance < 150) glyph = "✦";
      else if (distance < 500) glyph = "•";
      if (column >= 0 && column < columns) grid[row][column] = glyph;
    }
  } else if (half > 0) {
    const blocks = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    for (let row = 0; row < 3; row += 1) {
      let line = "";
      for (let column = -half; column <= half; column += 1) {
        const height = Math.floor(24 * (half * half - column * column) / (half * half));
        line += blocks[Math.max(0, Math.min(8, height - row * 8))];
      }
      placeBreathText(grid, 5 - row, line);
    }
  }
  return grid.map(row => row.join("").trimEnd() || " ");
}

function renderMindful(state: SimulationState, columns: number): DemoPanel {
  if (!isBreathingVisible(state)) return CLOSED_PANEL;
  const { exercise, style } = breathSettings(state);
  const phase = breathPhase(state, exercise);
  const rows = breathArt(style, phase.progress, columns).map(line => plainRow(color(line, PULSE_COLOR)));
  rows.push(clippedRow(color(centerText(`${phase.label}... ${Math.ceil(phase.remainingMs / 1000)}s`, columns), PULSE_COLOR), columns));
  rows.push(clippedRow(color(centerText(exercise.name, columns), `2;${PULSE_COLOR}`), columns));
  return { rows };
}

function contextTokens(tokens: number): string {
  const rounded = Math.round(tokens);
  if (Math.abs(rounded) >= 1_000_000) return `${(rounded / 1_000_000).toFixed(1)}M`;
  if (Math.abs(rounded) >= 100_000) return `${Math.round(rounded / 1000)}k`;
  if (Math.abs(rounded) >= 1000) return `${(rounded / 1000).toFixed(1)}k`;
  return String(rounded);
}

function signedContextTokens(tokens: number): string {
  if (Math.round(tokens) === 0) return "0";
  if (tokens > 0) return `+${contextTokens(tokens)}`;
  return `-${contextTokens(-tokens)}`;
}

function contextGrowth(state: SimulationState, window: number): { last: number | null; average: number | null; count: number } {
  const measurements = state.completed.slice(-CONTEXT_HISTORY_LIMIT);
  if (measurements.length < 2) return { last: null, average: null, count: 0 };
  const rising: number[] = [];
  let last = 0;
  for (let index = 1; index < measurements.length; index += 1) {
    const previousTokens = measurements[index - 1].contextTokens ?? measurements[index - 1].usage.context * window / 100;
    const currentTokens = measurements[index].contextTokens ?? measurements[index].usage.context * window / 100;
    last = currentTokens - previousTokens;
    if (last > 0) rising.push(last);
  }
  const samples = rising.slice(-CONTEXT_GROWTH_SAMPLE_LIMIT);
  let total = 0;
  for (const sample of samples) total += sample;
  return { last, average: samples.length > 0 ? total / samples.length : null, count: samples.length };
}

function contextTurnCount(turns: number): string {
  if (turns > 99) return "99+ turns";
  if (turns === 1) return "1 turn";
  return `${turns} turns`;
}

function contextCategoryColor(name: string): string {
  const colors: Record<string, string> = { success: "32", error: "31", warning: "33", suggestion: "36", inactive: "90", cyan: "36", blue: "34", green: "32", yellow: "33", red: "31", magenta: "35", purple: "35", white: "37" };
  if (colors[name]) return colors[name];
  if (/^#[0-9a-f]{6}$/i.test(name)) {
    const red = Number.parseInt(name.slice(1, 3), 16);
    const green = Number.parseInt(name.slice(3, 5), 16);
    const blue = Number.parseInt(name.slice(5, 7), 16);
    return `38;2;${red};${green};${blue}`;
  }
  return "37";
}

function contextWindowRow(tokens: number, columns: number, window: number, label = "window", categoryColor = "success"): DemoRow {
  const labelWidth = Math.min(19, Math.max(7, columns - 26));
  const barWidth = Math.min(48, Math.max(4, columns - labelWidth - 14));
  const ratio = tokens / window;
  let filled = 0;
  if (ratio > 0) filled = Math.min(barWidth, Math.max(1, Math.round(ratio * barWidth)));
  const gauge = color("█".repeat(filled), contextCategoryColor(categoryColor)) + color("░".repeat(barWidth - filled), "90");
  const fittedLabel = fitText(label.toLowerCase(), labelWidth).padEnd(labelWidth);
  return clippedRow(`${fittedLabel}${gauge} ${contextTokens(tokens).padStart(7)} ${Math.round(ratio * 100).toString().padStart(3)}%`, columns);
}

function contextCategoryRank(kind: "used" | "buffer" | "free"): number {
  if (kind === "free") return 2;
  if (kind === "buffer") return 1;
  return 0;
}

function contextCategoryRows(state: SimulationState, columns: number, window: number): DemoRow[] {
  const categories = [];
  for (const category of state.contextLens?.categories ?? []) {
    if (category.isDeferred || category.tokens <= 0) continue;
    categories.push(category);
  }
  categories.sort((left, right) => contextCategoryRank(left.kind) - contextCategoryRank(right.kind) || right.tokens - left.tokens);
  return categories.map(category => contextWindowRow(category.tokens, columns, window, category.name, category.color));
}

function renderContextLens(state: SimulationState, columns: number): DemoPanel {
  const latest = state.completed.at(-1);
  if (!latest) {
    let status = "ctx waiting for the first answer";
    if (state.panel.tab === "compacted") status = "ctx waiting for the next answer";
    const rows = state.panel.open ? [clippedRow(color("No reading of the context window yet. It arrives with the first answer.", "2"), columns)] : [];
    return { rows, status };
  }
  const window = state.contextLens?.window ?? CONTEXT_WINDOW_TOKENS;
  const threshold = state.contextLens?.threshold ?? window;
  const hasAutoCompact = state.contextLens?.threshold !== null && state.contextLens?.threshold !== undefined;
  const edge = hasAutoCompact ? "compact" : "full";
  const percent = latest.usage.context;
  const usedTokens = state.contextLens?.tokens ?? percent * window / 100;
  const headroom = Math.max(0, threshold - usedTokens);
  const growth = contextGrowth(state, window);
  const parts = [`ctx ${percent}%`, `${contextTokens(usedTokens)}/${contextTokens(window)}`];
  if (growth.last !== null) parts.push(`${signedContextTokens(growth.last)} last turn`);
  let turnsLeft: number | null = null;
  if (growth.average !== null) {
    turnsLeft = Math.max(0, Math.floor((threshold - usedTokens) / growth.average));
    if (turnsLeft === 0) parts.push(`${edge} next turn`);
    else parts.push(`${contextTurnCount(turnsLeft)} to ${edge}`);
  }
  let status = parts.join(" · ");
  if (status.length > CONTEXT_STATUS_LIMIT) status = `${status.slice(0, CONTEXT_STATUS_LIMIT - 1)}…`;
  if (!state.panel.open) return { rows: [], status };
  let heading = `${contextTokens(usedTokens)} of ${contextTokens(window)} used · ${percent}%`;
  if (state.contextLens) heading += ` · ${state.contextLens.model}`;
  const rows: DemoRow[] = [clippedRow(color(heading, "1"), columns), contextWindowRow(usedTokens, columns, window), plainRow(" ")];
  if (state.contextLens) rows.push(...contextCategoryRows(state, columns, window));
  else rows.push(clippedRow(color("This build of Claude Code answers $.session.usage with no category breakdown, so only the window bar is drawn.", "2"), columns));
  rows.push(plainRow(" "));
  const labelWidth = Math.min(19, Math.max(7, columns - 26));
  let growthText = "nothing measured yet - it arrives with the second answer";
  if (growth.last !== null) {
    growthText = `${signedContextTokens(growth.last)} last turn`;
    if (growth.average !== null) {
      const sampleWord = growth.count === 1 ? "turn" : "turns";
      growthText += `, ${signedContextTokens(growth.average)} average over ${growth.count} ${sampleWord}`;
    }
  }
  let headroomText = `${contextTokens(headroom)} left, no growth rate yet`;
  if (turnsLeft !== null) headroomText = `${contextTurnCount(turnsLeft)} at that rate, ${contextTokens(headroom)} left`;
  rows.push(clippedRow(color("growth".padEnd(labelWidth), "2") + growthText, columns));
  rows.push(clippedRow(color("headroom".padEnd(labelWidth), "2") + headroomText, columns));
  let limit = `${contextTokens(threshold)}, the window itself - this build reports no compaction threshold`;
  if (hasAutoCompact) limit = `${contextTokens(threshold)}, where auto-compaction runs`;
  else if (state.contextLens) limit = `${contextTokens(threshold)}, the compaction window (auto-compaction is off)`;
  rows.push(clippedRow(color("limit".padEnd(labelWidth), "2") + limit, columns));
  let counted = "locally, as an estimate - /context-lens refresh counts exactly";
  if (state.contextLens?.detail === "full" || state.panel.tab.toLowerCase() === "counted") counted = "exactly, with the token-count API";
  rows.push(clippedRow(color("counted".padEnd(labelWidth) + counted, "2"), columns));
  return { rows, status };
}

const DINO_SKY_ROWS = 9;
const DINO_SPRITE_COLUMN = DINO_LEFT_COLUMN - 2;
const DINO_STAND_FRAMES = [
  ["..##.", "###..", "..##.", "...##"],
  ["...#.", "###..", "..##.", "...##"],
];
const DINO_DUCK_SPRITE = ["..###", "####."];
const DINO_CLOUDS: readonly (readonly [number, number])[] = [[10, 1], [38, 2], [67, 0], [95, 2]];
const DINO_NIGHT_SCORE = 700;
const DINO_SPRITE_HALF_CELLS = [" ", "▀", "▄", "█"];
const DINO_JUMP_HEIGHTS = [0, 3, 6, 8, 8, 6, 3];

function dinoIsNight(state: SimulationState): boolean {
  return Math.floor(state.dino.score / DINO_NIGHT_SCORE) % 2 === 1;
}

function dinoHalfCell(sprite: string[], column: number, height: number, jumpHeight: number): string | null {
  if (column < 0 || column >= sprite[0].length) return null;
  const lower = sprite[2 * height - jumpHeight]?.[column] === "#";
  const upper = sprite[2 * height + 1 - jumpHeight]?.[column] === "#";
  const glyph = DINO_SPRITE_HALF_CELLS[(upper ? 1 : 0) + (lower ? 2 : 0)];
  return glyph === " " ? null : glyph;
}

function dinoJumpHeight(state: SimulationState): number {
  if (state.dino.jumpTicks <= 0) return 0;
  const remaining = Math.min(DINO_JUMP_HEIGHTS.length - 1, state.dino.jumpTicks);
  return DINO_JUMP_HEIGHTS[remaining];
}

function dinoPixel(state: SimulationState, width: number, row: number, column: number): string {
  const height = DINO_SKY_ROWS - 1 - row;
  const night = dinoIsNight(state);
  const jumpHeight = dinoJumpHeight(state);
  let sprite = DINO_STAND_FRAMES[0];
  if (state.dino.duckTicks > 0 && jumpHeight === 0) sprite = DINO_DUCK_SPRITE;
  else if (jumpHeight === 0 && !state.dino.over) sprite = DINO_STAND_FRAMES[Math.floor(state.clockTick / 2) % 2];
  const dinosaur = dinoHalfCell(sprite, column - DINO_SPRITE_COLUMN, height, jumpHeight);
  if (dinosaur) {
    let ansi = night ? "97" : "37";
    if (state.dino.over) ansi = "31";
    return color(dinosaur, ansi);
  }
  const obstacleLeft = Math.round(state.dino.obstacle);
  const hasObstacle = state.dino.started && column >= obstacleLeft && column < obstacleLeft + state.dino.obstacleWidth;
  if (hasObstacle) {
    if (state.dino.obstacleKind === "bird" && height === 1) {
      const birdFrames = ["▀▄", "▄▀"];
      return color(birdFrames[Math.floor(state.clockTick / 2) % 2][(column - obstacleLeft) % 2], night ? "95" : "35");
    }
    if (state.dino.obstacleKind === "tall" && height <= 1) return color(height === 1 ? "Ψ" : "║", "32");
    if (state.dino.obstacleKind !== "bird" && height === 0) return color("Ψ", "32");
  }
  const distance = state.dino.score / 10;
  for (const [start, cloudHeight] of DINO_CLOUDS) {
    if (height !== DINO_SKY_ROWS - 2 - cloudHeight) continue;
    const span = width + 24;
    const left = ((start - Math.floor(distance * 0.35)) % span + span) % span;
    const offset = column - left;
    if (offset >= 0 && offset < 4) return color("(~~)"[offset], "90");
  }
  if (night && height >= DINO_SKY_ROWS - 3 && (column * 7 + height * 13) % 29 === 0) return color("·", "90");
  return " ";
}

function dinoSkyRow(state: SimulationState, width: number, row: number, border: string): string {
  let text = "";
  for (let column = 0; column < width; column += 1) text += dinoPixel(state, width, row, column);
  return color("│", border) + text + color("│", border);
}

function renderDino(state: SimulationState, columns: number): DemoPanel {
  const width = Math.max(20, Math.min(96, columns - 2));
  const night = dinoIsNight(state);
  let border = night ? "34" : "90";
  if (state.dino.over) border = "31";
  const closeRow = actionRow([{ label: "close", action: { type: "close" } }]);
  closeRow.text = fitText(closeRow.text + color(" /dino stop closes it too", "2"), columns);
  const rows: DemoRow[] = [closeRow, plainRow(color(`╭${"─".repeat(width)}╮`, border))];
  for (let row = 0; row < DINO_SKY_ROWS; row += 1) rows.push(plainRow(dinoSkyRow(state, width, row, border)));
  let ground = "";
  for (let column = 0; column < width; column += 1) ground += ((column + Math.floor(state.dino.score / 10)) * 31) % 23 === 0 ? "." : "─";
  rows.push(plainRow(color("│", border) + color(ground, "2;90") + color("│", border)));
  rows.push(plainRow(color(`╰${"─".repeat(width)}╯`, border)));
  let status = "dino · click here, then space to jump · ↓ ducks · p pause";
  if (state.dino.started) {
    status = `dino · ${String(state.dino.score).padStart(5, "0")} · space jumps · ↓ ducks`;
    if (night) status += " · night";
    if (state.panel.paused) status = `dino · paused · score ${state.dino.score} · p resumes`;
    if (state.dino.over) status = `dino · ouch · score ${state.dino.score} · space runs again`;
  }
  status += ` · best ${state.dino.best}`;
  let statusColor = "2";
  if (state.phase === "complete") {
    status = `● Claude is done · ${status}`;
    statusColor = "1;33";
  } else if (state.dino.started && !state.panel.paused && !state.dino.over && state.dino.score > 0 && state.dino.score % 100 < 30) statusColor = "93";
  rows.push(clippedRow(color(status, statusColor), columns));
  return { rows };
}

const MASCOT_STAGE_ROWS = 14;
const MASCOT_STAGE_WIDTH = 100;
const MASCOT_HOME_COLUMN = 60;
const MASCOT_HOME_ROW = 4;
const MASCOT_SIDE_MARGIN = MASCOT_STAGE_WIDTH - MASCOT_HOME_COLUMN;
const MASCOT_PALETTE: Record<string, string> = {
  O: MASCOT_BODY, Q: MASCOT_ARM, K: "38;2;0;0;0", W: "38;2;242;242;242", G: "38;2;154;154;154",
  D: "38;2;74;74;74", C: "38;2;233;216;190", R: "38;2;122;74;42", L: "38;2;140;203;242", Y: "38;2;242;201;76",
};
const MASCOT_STANDING_LEGS: readonly (readonly [number, number])[] = [[2, 8], [2, 9], [4, 8], [4, 9], [12, 8], [12, 9], [14, 8], [14, 9]];
const MASCOT_CHIN: readonly (readonly [number, number])[] = [[5, 5], [6, 5], [7, 5], [5, 6], [6, 6], [7, 6], [7, 4], [8, 4]];
const MASCOT_SCROLL = [
  "RR........RR", "WCCCCCCCCCCR", "WCCRRCRRRCCR", "WCCCCCCCCCCR", "WCCRRRCRCCCR", "WCCCCCCCCCCR", "WCCRCRRCCCCR", "WCCCCCCCCCCR", "RR........RR",
];
const MASCOT_LAPTOP_FRAMES = [
  [".....LG", ".....LG", "....LG.", "....WG.", "YDWDG..", "GGGGG.."],
  [".....LG", ".....WG", "....LG.", "....LG.", "WDYDG..", "GGGGG.."],
];
type MascotPose = "idle" | "watch" | "think" | "read" | "write" | "done";

function mascotPose(state: SimulationState): MascotPose {
  if (state.composerTyping) return "watch";
  if (state.panel.tab === "celebrate" || state.panel.tab === "boop" || state.phase === "complete") return "done";
  if (state.panel.tab === "typing" || state.panel.tab === "edit-laptop") return "write";
  if (state.phase !== "working") return "idle";
  if (state.tick < READ_TICK) return "think";
  if (state.tick < EDIT_TICK) return "read";
  if (state.tick < CHECK_TICK) return "write";
  return "think";
}

function paintMascotPixel(grid: string[][], column: number, row: number, pixel: string): void {
  if (row < 0 || row >= grid.length || column < 0 || column >= grid[row].length) return;
  grid[row][column] = pixel;
}

function paintMascotRectangle(grid: string[][], column: number, row: number, width: number, height: number, pixel: string): void {
  for (let rowOffset = 0; rowOffset < height; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < width; columnOffset += 1) paintMascotPixel(grid, column + columnOffset, row + rowOffset, pixel);
  }
}

function paintMascotSprite(grid: string[][], column: number, row: number, sprite: string[]): void {
  for (let rowOffset = 0; rowOffset < sprite.length; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < sprite[rowOffset].length; columnOffset += 1) {
      const pixel = sprite[rowOffset][columnOffset];
      if (pixel !== ".") paintMascotPixel(grid, column + columnOffset, row + rowOffset, pixel);
    }
  }
}

function mascotCell(upper: string, lower: string): string {
  if (upper === "." && lower === ".") return " ";
  if (upper === ".") return color("▄", MASCOT_PALETTE[lower]);
  if (lower === ".") return color("▀", MASCOT_PALETTE[upper]);
  if (upper === lower) return color("█", MASCOT_PALETTE[upper]);
  return color("▀", `${MASCOT_PALETTE[upper]};${MASCOT_PALETTE[lower].replace("38;", "48;")}`);
}

function mascotGrid(state: SimulationState, columns: number): string[][] {
  const grid = Array.from({ length: MASCOT_STAGE_ROWS }, () => Array<string>(columns).fill("."));
  const pose = mascotPose(state);
  let originColumn = columns - MASCOT_SIDE_MARGIN;
  const originRow = MASCOT_HOME_ROW;
  if (pose === "write") originColumn += 1;
  paintMascotRectangle(grid, originColumn + 2, originRow, 13, 8, "O");
  for (const [column, row] of MASCOT_STANDING_LEGS) paintMascotPixel(grid, originColumn + column, originRow + row, "O");
  if (pose === "done") {
    paintMascotRectangle(grid, originColumn, originRow, 2, 2, "O");
    paintMascotRectangle(grid, originColumn + 15, originRow, 2, 2, "O");
  } else if (pose !== "write") {
    paintMascotRectangle(grid, originColumn, originRow + 4, 2, 2, "O");
    paintMascotRectangle(grid, originColumn + 15, originRow + 4, 2, 2, "O");
  }
  let eyeOffset = 0;
  let eyeRow = 2;
  if (pose === "watch" || pose === "read") eyeOffset = -1;
  if (pose === "read") eyeRow = 3;
  if (pose === "write") eyeOffset = 1;
  const isBlinking = state.clockTick > 0 && state.clockTick % 20 === 19;
  const eyeHeight = isBlinking ? 1 : 2;
  const blinkOffset = isBlinking ? 1 : 0;
  paintMascotRectangle(grid, originColumn + 4 + eyeOffset, originRow + eyeRow + blinkOffset, 1, eyeHeight, "K");
  paintMascotRectangle(grid, originColumn + 12 + eyeOffset, originRow + eyeRow + blinkOffset, 1, eyeHeight, "K");
  if (pose === "think") {
    for (const [column, row] of MASCOT_CHIN) paintMascotPixel(grid, originColumn + column, originRow + row, "Q");
  }
  if (pose === "read") {
    paintMascotSprite(grid, originColumn - 12, originRow + 1, MASCOT_SCROLL);
    paintMascotRectangle(grid, originColumn - 1, originRow + 5, 3, 2, "O");
  }
  if (pose === "write") {
    paintMascotRectangle(grid, originColumn + 2, originRow, 3, 8, "Q");
    const alternate = state.clockTick % 2;
    paintMascotSprite(grid, columns - MASCOT_SIDE_MARGIN + 16, originRow + 4, MASCOT_LAPTOP_FRAMES[alternate]);
    const nearRow = alternate === 0 ? 6 : 4;
    const farRow = alternate === 0 ? 4 : 6;
    paintMascotRectangle(grid, originColumn + 15, originRow + nearRow, 3, 2, "O");
    paintMascotRectangle(grid, originColumn + 15, originRow + farRow, 3, 2, "Q");
  }
  return grid;
}

function renderClawd(state: SimulationState, columns: number): DemoPanel {
  if (columns < 20) return { rows: [plainRow(" ")] };
  const grid = mascotGrid(state, columns);
  const rows: DemoRow[] = [];
  for (let row = 0; row < MASCOT_STAGE_ROWS; row += 2) {
    let text = "";
    for (let column = 0; column < columns; column += 1) text += mascotCell(grid[row][column], grid[row + 1][column]);
    rows.push(plainRow(text));
  }
  return { rows };
}

function flowBackground(panel: DemoPanel, columns: number): DemoPanel {
  const background = `\u001b[${FLOW_BACKGROUND}m`;
  const rows = panel.rows.map(row => {
    const padding = " ".repeat(Math.max(0, columns - terminalCellWidth(row.text)));
    const text = row.text.replaceAll("\u001b[0m", `\u001b[0m${background}`);
    return { ...row, text: background + text + padding + "\u001b[0m" };
  });
  return { ...panel, rows };
}

export function renderCoreDemo(state: SimulationState, columns: number): DemoPanel {
  if (state.modId === "context-lens") return renderContextLens(state, columns);
  if (!state.panel.open) return CLOSED_PANEL;
  switch (state.modId) {
    case "cc-arcade": return renderArcade(state, columns);
    case "cctop": return renderCctop(state, columns);
    case "flowpane": return flowBackground(renderFlowpane(state, columns), columns);
    case "mindful-claude": return renderMindful(state, columns);
    case "cc-dino": return renderDino(state, columns);
    case "clawd-buddy": return renderClawd(state, columns);
    default: return CLOSED_PANEL;
  }
}
