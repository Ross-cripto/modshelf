import { buildBoardLines } from "../arcade-terminal.ts";
import { AGENT_TICK, CHECK_TICK, DINO_LEFT_COLUMN, DINO_WIDTH, EDIT_TICK, READ_TICK, REPLY_TICK, SIMULATION_TICK_MS } from "../demo-config.ts";
import { actionRow, bar, color, fitText, plainRow, stripAnsi, terminalCellWidth } from "../demo-render.ts";
import type { DemoButton, DemoDefinition, DemoPanel, DemoRow, SimulationState } from "../demo-types.ts";

const CONTEXT_WINDOW_TOKENS = 200_000;
const TOKENS_PER_CONTEXT_PERCENT = CONTEXT_WINDOW_TOKENS / 100;
const COMPACTION_THRESHOLD_TOKENS = 160_000;
const BREATH_PHASE_MS = 5500;
const FLOW_BACKGROUND = "48;2;21;24;30";
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
    id: "flowpane", placement: "right-pane", startupCommand: "/flowpane", startsOpen: true, initialTab: "workflow",
    example: "Research the app and its tests in parallel, then implement an improvement.",
    instructions: "Send a message. The graph appears when the simulated Workflow tool starts. Select an agent to inspect its task, tools, and result.",
    limitation: "A local three-agent workflow recreates Flowpane’s phased nodes and detail view. Agent tasks and results are fixtures; its full graph engine and settings are not executed.",
    source: "https://github.com/mpolatcan/flowpane/tree/2450ad4c8cabd693cfb64f9b96937d07c59f6225/hooks",
    controls: [
      { label: "Workflow", action: { type: "tab", value: "workflow" } },
      { label: "Agent detail", action: { type: "tab", value: "details" } },
      { label: "Open / close", action: { type: "toggle" } },
    ],
  },
  {
    id: "mindful-claude", placement: "above-prompt", startupCommand: "", startsOpen: true, initialTab: "hrv",
    example: "Take a careful look at this project and suggest an improvement.",
    instructions: "Send a message to start the breathing band. It follows a 5.5-second inhale and exhale, then disappears when Claude’s turn ends.",
    limitation: "Recreates the default coherent-breathing pulse with local timing. The other exercise and animation presets are not included. The working turn is simulated.",
    source: "https://github.com/halluton/Mindful-Claude/tree/411c9c4f4f1c3d128159be7315823341ae7d9e2d/hooks",
    controls: [{ label: "Enable / disable", action: { type: "toggle" } }],
  },
  {
    id: "context-lens", placement: "right-pane", startupCommand: "", startsOpen: false, initialTab: "summary",
    example: "Read the project and explain how its main feature works.",
    instructions: "Send a message to receive the first context reading. Open the pane for categories, then send another message to see growth. Compact starts a fresh measurement.",
    limitation: "Recreates the pinned status and command-opened pane with a 200k-token fixture window. Readings update after completed main turns; no token-count API is used.",
    source: "https://github.com/Arunjay4213/claude-mods/blob/d4fffd7de9204a62b10e7b3604fc893158fa25fd/plugins/context-lens/hooks/register.tsx",
    controls: [
      { label: "Open / close pane", action: { type: "toggle" } },
      { label: "Compact context", action: { type: "compact" } },
    ],
  },
  {
    id: "cc-dino", placement: "above-prompt", startupCommand: "/dino", startsOpen: true, initialTab: "dino",
    example: "Explore the project and run its checks.",
    instructions: "Send a message, then click the game and use Space or ↑ to jump while Claude works. Completion pauses the run and shows the original yellow banner.",
    limitation: "A local jumping run recreates the terminal half-block dinosaur, cactus, pause, restart, and completion behavior. The original’s birds, ducking, and day/night stages are not included.",
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

function wrappedActions(buttons: DemoButton[], columns: number): DemoRow[] {
  const rows: DemoRow[] = [];
  let currentButtons: DemoButton[] = [];
  let currentWidth = 0;
  for (const button of buttons) {
    const buttonWidth = terminalCellWidth(button.label) + 4;
    const separatorWidth = currentButtons.length > 0 ? 1 : 0;
    if (currentWidth + separatorWidth + buttonWidth > columns && currentButtons.length > 0) {
      rows.push(actionRow(currentButtons));
      currentButtons = [];
      currentWidth = 0;
    }
    if (currentButtons.length > 0) currentWidth += 1;
    currentButtons.push(button);
    currentWidth += buttonWidth;
  }
  if (currentButtons.length > 0) rows.push(actionRow(currentButtons));
  return rows;
}

function renderArcade(state: SimulationState, columns: number): DemoPanel {
  if (state.panel.tab === "games") {
    return { rows: [
      actionRow([{ label: "2048", action: { type: "tab", value: "2048" } }, { label: "close", action: { type: "close" } }]),
      clippedRow(color("This browser demo includes 2048.", "2"), columns),
    ] };
  }
  const rows: DemoRow[] = [actionRow([
    { label: "← games", action: { type: "tab", value: "games" } },
    { label: "close", action: { type: "close" } },
  ])];
  for (const line of buildBoardLines(state.arcade.game)) rows.push(plainRow(line));
  let status = `2048 · score ${state.arcade.game.score} · best ${state.arcade.bestScore}`;
  if (state.arcade.game.over) status += " · no moves left";
  if (state.phase === "complete") status = color(`● Claude is done · ${status}`, "1;33");
  else status = color(status, "2");
  rows.push(clippedRow(status, columns));
  rows.push(actionRow([{ label: "r · new game", action: { type: "game-restart" } }]));
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

function cctopMetricDetail(state: SimulationState, columns: number): DemoRow[] {
  const usage = state.usage;
  const rows: DemoRow[] = [];
  switch (state.panel.selection) {
    case 1:
      rows.push(plainRow(color("5h limit", "1")));
      rows.push(clippedRow(`${bar(usage.fiveHour, 12)} ${usage.fiveHour}%`, columns));
      rows.push(clippedRow(color("Local usage fixture · resets in 2h 40m", "2"), columns));
      break;
    case 2:
      rows.push(plainRow(color("Cache TTL", "1")));
      rows.push(clippedRow(`${compactTokens(usage.cached)} cached input tokens`, columns));
      rows.push(clippedRow(color("Fixture cache window: 5 minutes", "2"), columns));
      break;
    case 3:
      rows.push(plainRow(color("Session spend", "1")));
      rows.push(plainRow(color(`$${usage.cost.toFixed(3)}`, "32")));
      rows.push(clippedRow(`${compactTokens(usage.input)} in · ${compactTokens(usage.output)} out`, columns));
      break;
    case 4:
      rows.push(plainRow(color("Check / rework", "1")));
      rows.push(clippedRow(state.tick >= CHECK_TICK ? "1 check · 0 retries" : "No checks yet", columns));
      rows.push(clippedRow(color("Checks appear after the edit.", "2"), columns));
      break;
    case 5:
      rows.push(plainRow(color("Calls / errors", "1")));
      rows.push(clippedRow(`${getFixtureToolCount(state)} tool calls · 0 errors`, columns));
      rows.push(clippedRow(color("This local turn follows a successful path.", "2"), columns));
      break;
    default:
      rows.push(plainRow(color("Context window", "1")));
      rows.push(clippedRow(`${bar(usage.context, 12)} ${usage.context}%`, columns));
      rows.push(clippedRow(`${compactTokens(usage.context * TOKENS_PER_CONTEXT_PERCENT)} / 200k tokens`, columns));
  }
  return rows;
}

function cctopOverview(state: SimulationState, columns: number): DemoRow[] {
  const usage = state.usage;
  return [
    ...wrappedActions([{ label: `ctx ${usage.context}%`, action: { type: "select", index: 0 } }, { label: `5h ${usage.fiveHour}%`, action: { type: "select", index: 1 } }], columns),
    ...wrappedActions([{ label: "cache TTL", action: { type: "select", index: 2 } }, { label: `$${usage.cost.toFixed(2)}`, action: { type: "select", index: 3 } }], columns),
    ...wrappedActions([{ label: "check/rework", action: { type: "select", index: 4 } }, { label: "calls/errors", action: { type: "select", index: 5 } }], columns),
    plainRow(color("─".repeat(Math.min(columns, 40)), "2")),
    ...cctopMetricDetail(state, columns),
  ];
}

function cctopBody(state: SimulationState, columns: number): DemoRow[] {
  switch (state.panel.tab.toLowerCase()) {
    case "coach":
      return [plainRow(color("Coach", "1")), clippedRow("Ask → inspect → edit → check", columns), clippedRow(color("Next: give Claude a focused task.", "2"), columns)];
    case "tools": {
      const rows = [plainRow(color("Tools", "1"))];
      for (const entry of state.transcript) {
        if (entry.role === "tool") rows.push(clippedRow(`✓ ${entry.text}`, columns));
      }
      if (rows.length === 1) rows.push(plainRow(color("No tool calls yet.", "2")));
      return rows.slice(-9);
    }
    case "agents":
      if (state.tick < AGENT_TICK) return [plainRow(color("No agents yet.", "2"))];
      return [
        clippedRow(color(`${state.tick >= EDIT_TICK ? "✓" : "◌"} researcher · UI`, "32"), columns),
        clippedRow(color(`${state.tick >= CHECK_TICK ? "✓" : "◌"} researcher · tests`, "33"), columns),
        clippedRow(color(`${state.tick >= REPLY_TICK ? "✓" : "◌"} implementer`, "36"), columns),
      ];
    case "files":
      if (state.tick < READ_TICK) return [plainRow(color("No file activity yet.", "2"))];
      return [clippedRow(color("src/app.ts · read", "36"), columns), clippedRow(state.tick >= EDIT_TICK ? color("src/app.ts · edited +8 −2", "33") : "tests/app.test.ts · read", columns)];
    case "events":
      return [plainRow(color("Session events", "1")), clippedRow(`turn ${state.turn} · ${state.phase}`, columns), clippedRow(`activity · ${getWorkLabel(state)}`, columns), clippedRow(`${state.completed.length} main turns completed`, columns)];
    case "advisor":
      return [plainRow(color("Advisor", "1")), clippedRow("Local fixture observation", columns), clippedRow(color("Read before editing; check after.", "2"), columns), clippedRow(color("No advisor model is called.", "2"), columns)];
    default:
      return cctopOverview(state, columns);
  }
}

function renderCctop(state: SimulationState, columns: number): DemoPanel {
  const rows: DemoRow[] = [plainRow(color("cctop", "1")), ...wrappedActions(CCTOP_TABS, columns)];
  rows.push(clippedRow(color(`act ${getWorkLabel(state)}`, "33"), columns));
  rows.push(clippedRow(color("rule read → edit → check", "2"), columns));
  rows.push(...cctopBody(state, columns));
  return { rows };
}

type FlowAgent = { name: string; phase: number; finishTick: number; task: string; tool: string; result: string };
const FLOW_AGENTS: FlowAgent[] = [
  { name: "researcher · UI", phase: 1, finishTick: EDIT_TICK, task: "Inspect the app and identify a focused improvement.", tool: "Read src/app.ts", result: "Found the main feature and its entry point." },
  { name: "researcher · tests", phase: 1, finishTick: CHECK_TICK, task: "Inspect the tests and identify the relevant checks.", tool: "Read tests/app.test.ts", result: "Identified the checks for the proposed edit." },
  { name: "implementer", phase: 2, finishTick: REPLY_TICK, task: "Apply a focused change and verify the result.", tool: "Edit src/app.ts", result: "Applied the fixture edit and passed the checks." },
];

function flowAgentState(state: SimulationState, agent: FlowAgent): { label: string; ansi: string } {
  if (state.phase === "stopped") return { label: "stopped", ansi: "90" };
  if (agent.phase === 2 && state.tick < EDIT_TICK) return { label: "waiting", ansi: "90" };
  if (state.phase === "complete" || state.tick >= agent.finishTick) return { label: "done", ansi: "32" };
  return { label: "running", ansi: "33" };
}

function flowNode(state: SimulationState, agent: FlowAgent, index: number, columns: number): DemoRow[] {
  const width = Math.max(20, Math.min(32, columns));
  const status = flowAgentState(state, agent);
  const title = ` ${agent.name} · ${status.label} `;
  const titleText = stripAnsi(fitText(title, width - 2));
  const top = `╭${titleText}${"─".repeat(Math.max(0, width - terminalCellWidth(titleText) - 2))}╮`;
  const tool = status.label === "done" ? "claude-sonnet · done" : agent.tool;
  const toolText = stripAnsi(fitText(tool, width - 4)).padEnd(width - 4);
  return [
    { text: color(color(top, status.ansi), FLOW_BACKGROUND), targets: [{ column: 1, width, action: { type: "select", index } }] },
    plainRow(color(`│ ${toolText} │`, `${FLOW_BACKGROUND};${status.ansi}`)),
    plainRow(color(`╰${"─".repeat(width - 2)}╯`, `${FLOW_BACKGROUND};${status.ansi}`)),
  ];
}

function renderFlowDetail(state: SimulationState, columns: number): DemoPanel {
  const selection = Math.min(FLOW_AGENTS.length - 1, Math.max(0, state.panel.selection));
  const agent = FLOW_AGENTS[selection];
  const status = flowAgentState(state, agent);
  const rows = [actionRow([{ label: "← flow", action: { type: "tab", value: "workflow" } }]), clippedRow(color(agent.name, "1"), columns), clippedRow(color(status.label, status.ansi), columns)];
  rows.push(plainRow(color("Prompt", "2")), clippedRow(agent.task, columns));
  rows.push(plainRow(color("Tools", "2")), clippedRow(agent.tool, columns));
  if (status.label === "done") rows.push(plainRow(color("Result", "2")), clippedRow(agent.result, columns));
  rows.push(clippedRow(color("flowpane 0.10.0", "2"), columns));
  return { rows };
}

function renderFlowpane(state: SimulationState, columns: number): DemoPanel {
  if (state.tick < AGENT_TICK) return CLOSED_PANEL;
  if (state.panel.tab === "details") return renderFlowDetail(state, columns);
  const rows: DemoRow[] = [clippedRow(color("phase 1 · research", "2"), columns)];
  rows.push(...flowNode(state, FLOW_AGENTS[0], 0, columns));
  rows.push(...flowNode(state, FLOW_AGENTS[1], 1, columns));
  rows.push(clippedRow(color("↓ phase 2 · implement", "2"), columns));
  rows.push(...flowNode(state, FLOW_AGENTS[2], 2, columns));
  rows.push(actionRow([{ label: "agent detail", action: { type: "tab", value: "details" } }, { label: "close", action: { type: "close" } }]));
  rows.push(clippedRow(color("flowpane 0.10.0", "2"), columns));
  return { rows };
}

function shadedPulse(halfWidth: number): string {
  if (halfWidth === 0) return "";
  const fade = ["▓", "▒▓", "░▒▓"];
  const edge = fade[Math.min(halfWidth, 3) - 1];
  const fill = "█".repeat(Math.max(0, halfWidth - 3));
  return edge + fill + fill + Array.from(edge).reverse().join("");
}

function renderMindful(state: SimulationState, columns: number): DemoPanel {
  if (state.phase !== "working") return CLOSED_PANEL;
  const elapsed = state.tick * SIMULATION_TICK_MS % (BREATH_PHASE_MS * 2);
  const inhaling = elapsed < BREATH_PHASE_MS;
  const phaseElapsed = inhaling ? elapsed : elapsed - BREATH_PHASE_MS;
  const progress = phaseElapsed / BREATH_PHASE_MS;
  const eased = progress * (2 - progress);
  const amount = inhaling ? eased : 1 - eased;
  const maximumHalfWidth = Math.floor(Math.min(60, Math.max(4, columns - 4)) / 2);
  const halfWidth = Math.max(1, Math.floor(maximumHalfWidth * amount));
  const rows: DemoRow[] = [plainRow("")];
  for (const ratio of [0.2, 0.6, 1, 0.6, 0.2]) {
    const pulse = shadedPulse(Math.floor(halfWidth * ratio));
    rows.push(plainRow(color(centerText(pulse, columns), PULSE_COLOR)));
  }
  rows.push(plainRow(""));
  const remaining = Math.ceil((BREATH_PHASE_MS - phaseElapsed) / 1000);
  const phase = inhaling ? "Breathe in" : "Breathe out";
  rows.push(plainRow(color(centerText(`${phase}... ${remaining}s`, columns), PULSE_COLOR)));
  rows.push(plainRow(color(centerText("Coherent Breathing", columns), `2;${PULSE_COLOR}`)));
  return { rows };
}

function contextGrowth(state: SimulationState): { last: number | null; average: number | null } {
  const measurements = state.completed;
  if (measurements.length < 2) return { last: null, average: null };
  const latest = measurements[measurements.length - 1].usage.context;
  const previous = measurements[measurements.length - 2].usage.context;
  let positiveTotal = 0;
  let positiveCount = 0;
  const start = Math.max(1, measurements.length - 5);
  for (let index = start; index < measurements.length; index += 1) {
    const change = (measurements[index].usage.context - measurements[index - 1].usage.context) * TOKENS_PER_CONTEXT_PERCENT;
    if (change > 0) {
      positiveTotal += change;
      positiveCount += 1;
    }
  }
  return { last: (latest - previous) * TOKENS_PER_CONTEXT_PERCENT, average: positiveCount > 0 ? positiveTotal / positiveCount : null };
}

function contextCategory(label: string, tokens: number, columns: number, ansi: string): DemoRow {
  const labelWidth = Math.max(7, Math.min(18, columns - 26));
  const barWidth = Math.max(4, Math.min(18, columns - labelWidth - 14));
  const percentage = tokens / CONTEXT_WINDOW_TOKENS * 100;
  return clippedRow(`${label.padEnd(labelWidth)} ${color(bar(percentage, barWidth), ansi)} ${compactTokens(tokens).padStart(6)} ${Math.round(percentage)}%`, columns);
}

function renderContextLens(state: SimulationState, columns: number): DemoPanel {
  const latest = state.completed.at(-1);
  if (!latest) {
    let status = "ctx waiting for the first answer";
    if (state.panel.tab === "compacted") status = "ctx waiting for the next answer";
    const rows = state.panel.open ? [clippedRow(color("No reading of the context window yet.", "2"), columns), clippedRow(color("It arrives with the first answer.", "2"), columns)] : [];
    return { rows, status };
  }
  const percent = latest.usage.context;
  const usedTokens = percent * TOKENS_PER_CONTEXT_PERCENT;
  const headroom = Math.max(0, COMPACTION_THRESHOLD_TOKENS - usedTokens);
  const growth = contextGrowth(state);
  let status = `ctx ${percent}% · ${compactTokens(usedTokens)}/200k`;
  if (growth.last !== null) status += ` · ${growth.last >= 0 ? "+" : ""}${compactTokens(growth.last)} last turn`;
  if (growth.average !== null) status += ` · ${Math.floor(headroom / growth.average)} turns to compact`;
  if (!state.panel.open) return { rows: [], status };
  const rows: DemoRow[] = [clippedRow(color(`${compactTokens(usedTokens)} of 200k used · ${percent}%`, "1"), columns), contextCategory("window", usedTokens, columns, "32"), plainRow("")];
  rows.push(contextCategory("system prompt", usedTokens * 0.48, columns, "35"));
  rows.push(contextCategory("messages", usedTokens * 0.28, columns, "36"));
  rows.push(contextCategory("tool results", usedTokens * 0.20, columns, "33"));
  rows.push(contextCategory("other", usedTokens * 0.04, columns, "34"));
  rows.push(contextCategory("buffer", CONTEXT_WINDOW_TOKENS - COMPACTION_THRESHOLD_TOKENS, columns, "90"));
  rows.push(contextCategory("free", headroom, columns, "90"));
  rows.push(plainRow(""));
  if (growth.last === null) rows.push(clippedRow(color("growth · arrives with the second answer", "2"), columns));
  else rows.push(clippedRow(`growth · ${growth.last >= 0 ? "+" : ""}${compactTokens(growth.last)} last turn`, columns));
  rows.push(clippedRow(`headroom · ${compactTokens(headroom)} left`, columns));
  rows.push(clippedRow(color("limit · 160k, auto-compaction threshold", "2"), columns));
  rows.push(clippedRow(color("counted · local fixture estimate", "2"), columns));
  return { rows, status };
}

function dinoPixel(state: SimulationState, width: number, row: number, column: number): string {
  const jumpOffset = state.dino.jumpTicks > 0 ? 2 : 0;
  const spriteTop = 3 - jumpOffset;
  const obstacleColumn = Math.max(0, Math.min(width - 1, state.dino.obstacle));
  const dinosaurColumn = column - DINO_LEFT_COLUMN;
  const hasDinosaur = dinosaurColumn >= 0 && dinosaurColumn < DINO_WIDTH;
  if (row === spriteTop && hasDinosaur) return color("  ▄█▀"[dinosaurColumn], state.dino.over ? "31" : "37");
  if (row === spriteTop + 1 && hasDinosaur) return color("▀▀█▄ "[dinosaurColumn], state.dino.over ? "31" : "37");
  if (column === obstacleColumn && row === 3) return color("Ψ", "32");
  if (column === obstacleColumn && row === 4) return color("║", "32");
  if (row === 0 && column >= width - 12 && column < width - 8) return color("(~~)"[column - (width - 12)], "90");
  return " ";
}

function dinoSkyRow(state: SimulationState, width: number, row: number): string {
  let text = "";
  for (let column = 0; column < width; column += 1) {
    text += dinoPixel(state, width, row, column);
  }
  return color("│", "90") + text + color("│", "90");
}

function renderDino(state: SimulationState, columns: number): DemoPanel {
  const width = Math.max(20, Math.min(70, columns - 2));
  const rows: DemoRow[] = [plainRow(color(`╭${"─".repeat(width)}╮`, "90"))];
  for (let row = 0; row < 5; row += 1) rows.push(plainRow(dinoSkyRow(state, width, row)));
  rows.push(plainRow(color(`│${"─".repeat(width)}│`, "2;90")));
  rows.push(plainRow(color(`╰${"─".repeat(width)}╯`, "90")));
  let status = `dino · ${String(state.dino.score).padStart(5, "0")} · space jumps`;
  if (!state.dino.started) status = "dino · click here, then space to jump";
  if (state.panel.paused) status = `dino · paused · score ${state.dino.score} · p resumes`;
  if (state.dino.over) status = `dino · ouch · score ${state.dino.score} · space runs again`;
  if (state.phase === "complete") rows.push(clippedRow(color(`● Claude is done · ${status}`, "1;33"), columns));
  else rows.push(clippedRow(color(status, "2"), columns));
  rows.push(actionRow([{ label: "jump", action: { type: "dino-jump" } }, { label: "p · pause", action: { type: "pause" } }, { label: "r · restart", action: { type: "game-restart" } }]));
  return { rows };
}

const MASCOT_IDLE = [
  "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..OOKOOOOOOOKOO..", "..OOKOOOOOOOKOO..", "QQOOOOOOOOOOOOOQQ", "QQOOOOOOOOOOOOOQQ", "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..O.O.......O.O..", "..O.O.......O.O..",
];
const MASCOT_EDIT = [
  "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..OOKOOOOOOOKOO..", "..OOKOOOOOOOKOO..", "..OQQQOOOOQQQOO..", "..OQQQOOOOQQQOO..", "..OOOOOOOOOOOOO..", "..GGGGGGGGGGGGG..", "..O.O.......O.O..", "..O.O.......O.O..",
];
const MASCOT_WATCH = [
  "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..OKOOOOOOOKOOO..", "..OOOOOOOOOOOOO..", "QQOOOOOOOOOOOOOQQ", "QQOOOOOOOOOOOOOQQ", "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..O.O.......O.O..", "..O.O.......O.O..",
];
const MASCOT_THINK = [
  "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..OOKOOOOOOOKOO..", "..OOKOOOOOOOKOO..", "QQOOOOOQQQOOOOO..", "QQOOOOOQQQOOOOO..", "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..O.O.......O.O..", "..O.O.......O.O..",
];
const MASCOT_READ = [
  "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..OOKOOOOOOOKOO..", "..OOKOOOOOOOKOO..", "..OQQCCCCCCQQOO..", "..OQQCCCCCCQQOO..", "..OOOCCCCCCOOOO..", "..OOOCCCCCCOOOO..", "..O.O.......O.O..", "..O.O.......O.O..",
];
const MASCOT_DONE = [
  "QQOOOOOOOOOOOOOQQ", "QQOOOOOOOOOOOOOQQ", "..OOKOOOOOOOKOO..", "..OOKOOOOOOOKOO..", "..OOOOOKOKOOOOO..", "..OOOOOOKOOOOOO..", "..OOOOOOOOOOOOO..", "..OOOOOOOOOOOOO..", "..O.O.......O.O..", "..O.O.......O.O..",
];

function mascotForeground(pixel: string): string {
  if (pixel === "O") return MASCOT_BODY;
  if (pixel === "Q") return MASCOT_ARM;
  if (pixel === "K") return "38;2;0;0;0";
  if (pixel === "G") return "38;2;154;154;154";
  if (pixel === "C") return "38;2;233;216;190";
  return "39";
}

function mascotCell(upper: string, lower: string): string {
  if (upper === "." && lower === ".") return " ";
  if (upper === ".") return color("▄", mascotForeground(lower));
  if (lower === ".") return color("▀", mascotForeground(upper));
  if (upper === lower) return color("█", mascotForeground(upper));
  const background = mascotForeground(lower).replace("38;", "48;");
  return color("▀", `${mascotForeground(upper)};${background}`);
}

function mascotPose(state: SimulationState): string[] {
  if (state.composerTyping) return MASCOT_WATCH;
  if (state.panel.tab === "celebrate" || state.panel.tab === "boop" || state.phase === "complete") return MASCOT_DONE;
  if (state.panel.tab === "typing" || state.panel.tab === "edit-laptop") return MASCOT_EDIT;
  if (state.phase !== "working") return MASCOT_IDLE;
  if (state.tick < READ_TICK) return MASCOT_THINK;
  if (state.tick < EDIT_TICK) return MASCOT_READ;
  if (state.tick < CHECK_TICK) return MASCOT_EDIT;
  return MASCOT_THINK;
}

function renderClawd(state: SimulationState, columns: number): DemoPanel {
  const sprite = mascotPose(state);
  const rows: DemoRow[] = [plainRow(""), plainRow("")];
  const left = " ".repeat(Math.max(0, columns - 24));
  for (let row = 0; row < sprite.length; row += 2) {
    let text = left;
    for (let column = 0; column < sprite[row].length; column += 1) text += mascotCell(sprite[row][column], sprite[row + 1][column]);
    rows.push(plainRow(text));
  }
  return { rows };
}

export function renderCoreDemo(state: SimulationState, columns: number): DemoPanel {
  if (state.modId === "context-lens") return renderContextLens(state, columns);
  if (!state.panel.open) return CLOSED_PANEL;
  switch (state.modId) {
    case "cc-arcade": return renderArcade(state, columns);
    case "cctop": return renderCctop(state, columns);
    case "flowpane": return renderFlowpane(state, columns);
    case "mindful-claude": return renderMindful(state, columns);
    case "cc-dino": return renderDino(state, columns);
    case "clawd-buddy": return renderClawd(state, columns);
    default: return CLOSED_PANEL;
  }
}
