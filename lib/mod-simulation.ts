import type { DemoId } from "./mod-demos.ts";
import type { DemoAction, DemoUsage, DinoState, SimulationState, TranscriptEntry } from "./demo-types.ts";
import { createOpeningState, reduceDemo } from "./arcade-demo.ts";
import { createGame } from "./cc-arcade-2048.ts";
import { getFixtureFilePath, getHeldCommandFixture } from "./demo-fixtures.ts";
import { AGENT_TICK, CHECK_TICK, DINO_LEFT_COLUMN, DINO_WIDTH, EDIT_TICK, MAX_PROMPT_LENGTH, MAX_QUEUED_PROMPTS, MAX_TRANSCRIPT_ENTRIES, MUSIC_DURATION_SECONDS, READ_TICK, REPLY_TICK, SIMULATION_TICK_MS, WORK_TICKS } from "./demo-config.ts";

const QUEUE_GAP_TICKS = Math.ceil(5200 / SIMULATION_TICK_MS);
const COMMAND_TIMEOUT_TICKS = Math.ceil(60000 / SIMULATION_TICK_MS);
const DINO_STARTING_OBSTACLE_COLUMN = 24;
const DINO_JUMP_TICKS = 6;
const TURN_FIXTURE_COST = 0.028;
const TURN_CONTEXT_GROWTH = 8;
const CLOSED_ON_START: DemoId[] = ["context-lens", "quota-meter", "token-ledger", "blast-radius", "md-preview", "flowpane"];
const EMPTY_USAGE: DemoUsage = { input: 0, output: 0, cached: 0, cost: 0, context: 0, fiveHour: 0, sevenDay: 0 };
const INITIAL_TABS: Partial<Record<DemoId, string>> = { "cc-arcade": "2048", cctop: "Overview", "mission-control": "Who", "mermaid-draw": "Color", "md-preview": "Single" };

export function sanitizePrompt(text: string): string {
  return text.replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_PROMPT_LENGTH);
}

export function createSimulation(modId: DemoId): SimulationState {
  return {
    modId, phase: "idle", tick: 0, clockTick: 0, turn: 0, prompt: "", submittedFilePath: null,
    nextEntryId: 1, transcript: [{ id: 0, role: "system", text: "Claude Code · example-project · local simulation", turn: 0 }],
    completed: [], queue: [], lastQueueDispatchTick: -QUEUE_GAP_TICKS, injected: [], steering: [], usage: { ...EMPTY_USAGE }, turnStartingUsage: { ...EMPTY_USAGE },
    panel: { open: !CLOSED_ON_START.includes(modId), tab: INITIAL_TABS[modId] ?? "", selection: -1, paused: false, rendered: true, vertical: false },
    attachment: modId === "image-view", composerTyping: false,
    playback: { playing: true, track: 0, position: 0 },
    budget: { dollars: 0.02, overridden: false, enabled: true, warnOnly: false },
    decision: null, decisionTick: 0, browserUrl: "local://example", files: { hidden: false, sizes: false, collapsed: false, query: "" },
    review: { comments: [], draft: "" }, taskStartedAt: 0, tasksCleared: false,
    arcade: createOpeningState(), dino: freshDinosaur(false), notice: "",
  };
}

export function appendEntry(state: SimulationState, role: TranscriptEntry["role"], text: string): SimulationState {
  const transcript = [...state.transcript, { id: state.nextEntryId, role, text, turn: state.turn }].slice(-MAX_TRANSCRIPT_ENTRIES);
  return { ...state, transcript, nextEntryId: state.nextEntryId + 1 };
}

function exceedsBudget(state: SimulationState): boolean {
  return state.modId === "budget-guard" && state.budget.enabled && !state.budget.overridden && !state.budget.warnOnly && state.budget.dollars > 0 && state.usage.cost >= state.budget.dollars;
}

function startTurn(state: SimulationState, text: string, fromQueue = false): SimulationState {
  const submittedFilePath = state.modId === "filetree" ? getFixtureFilePath(state.panel.selection) : null;
  let next: SimulationState = {
    ...state,
    phase: "working",
    tick: 0,
    turn: state.turn + 1,
    prompt: text,
    injected: [],
    submittedFilePath,
    turnStartingUsage: { ...state.usage },
    notice: "",
    decision: null,
    composerTyping: false,
    attachment: false,
    panel: { ...state.panel, selection: state.modId === "prompt-rail" ? -1 : state.panel.selection },
  };
  const attachment = state.attachment ? " [Image #1]" : "";
  if (fromQueue) return appendEntry(next, "system", `The prompt-queue plugin sent a message: ${text}`);
  const fileContext = submittedFilePath ? `\nSelected file: ${submittedFilePath}` : "";
  next = appendEntry(next, "user", text + attachment + fileContext);
  return next;
}

export function submitPrompt(state: SimulationState, rawText: string): SimulationState {
  const text = sanitizePrompt(rawText);
  if (!text) return state;
  if (text.startsWith("/")) return submitCommand(state, text);
  if (state.phase === "working" || state.phase === "decision") return { ...state, notice: "Claude is still working. Use Stop before sending another prompt. /q adds an explicit queue entry in prompt-queue." };
  if (exceedsBudget(state)) return { ...state, phase: "decision", decision: "budget", decisionTick: state.clockTick, prompt: text, notice: "Budget: this prompt is held before sending." };
  return startTurn(state, text);
}

function queueText(state: SimulationState, text: string): SimulationState {
  if (!text) return state;
  if (state.queue.length >= MAX_QUEUED_PROMPTS) return { ...state, notice: "This browser demo holds up to 8 queued prompts." };
  return { ...state, queue: [...state.queue, text], notice: "Queued. It sends when Claude is idle." };
}

function togglePanel(state: SimulationState, open?: boolean, tab?: string): SimulationState {
  return { ...state, panel: { ...state.panel, open: open ?? !state.panel.open, tab: tab ?? state.panel.tab } };
}

function isTurnRunning(state: SimulationState): boolean {
  return state.phase === "working" || state.phase === "decision";
}

function canDispatchQueue(state: SimulationState): boolean {
  if (state.modId !== "prompt-queue") return false;
  if (isTurnRunning(state)) return false;
  if (state.queue.length === 0) return false;
  return state.clockTick - state.lastQueueDispatchTick >= QUEUE_GAP_TICKS;
}

function dispatchQueuedPrompt(state: SimulationState): SimulationState {
  if (!canDispatchQueue(state)) return state;
  const [prompt, ...queue] = state.queue;
  const next = { ...state, queue, lastQueueDispatchTick: state.clockTick };
  if (prompt.startsWith("/")) return submitCommand(next, prompt);
  return startTurn(next, prompt, true);
}

function parseQueueCommand(state: SimulationState, argumentsText: string): SimulationState {
  const [command, indexText] = argumentsText.split(" ");
  const index = Number(indexText) - 1;
  if (!argumentsText || command === "status" || command === "help") return { ...state, notice: `${state.queue.length} queued. /q text · /q now N · /q rm N · /q clear` };
  if (command === "clear") return applyDemoAction(state, { type: "queue-clear" });
  if (command === "send") {
    if (isTurnRunning(state)) return { ...state, notice: "Queue waits until the main turn ends. /q now N explicitly steers a running turn." };
    return dispatchQueuedPrompt(state);
  }
  if (command === "now") return applyDemoAction(state, { type: "queue-now", index });
  if (command === "rm") return applyDemoAction(state, { type: "queue-remove", index });
  if (command === "up") return applyDemoAction(state, { type: "queue-up", index });
  if (command === "down") return applyDemoAction(state, { type: "queue-down", index });
  if (command === "edit") return { ...state, notice: "Use the queue Edit button to move that message into the composer." };
  return queueText(state, argumentsText);
}

function parseGuardCommand(state: SimulationState, argumentsText: string): SimulationState {
  const [command, value] = argumentsText.split(" ");
  if (command === "cost") return applyDemoAction(state, { type: "budget", dollars: Number(value) });
  if (command === "override") return { ...state, budget: { ...state.budget, overridden: true }, notice: "Budget override for one main turn." };
  if (command === "off" || command === "on") return { ...state, budget: { ...state.budget, enabled: command === "on" }, notice: `Budget guard ${command}.` };
  if (command === "warn" || command === "block") return { ...state, budget: { ...state.budget, warnOnly: command === "warn" }, notice: `Budget guard: ${command} mode.` };
  return { ...state, notice: `/guard cost N · /guard override · /guard warn · /guard block · /guard off · /guard on. Fixture cost $${state.usage.cost.toFixed(3)}.` };
}

export function submitCommand(state: SimulationState, text: string): SimulationState {
  const separator = text.indexOf(" ");
  const command = separator < 0 ? text : text.slice(0, separator);
  const argumentsText = separator < 0 ? "" : text.slice(separator + 1);
  const argument = argumentsText.toLowerCase();
  switch (state.modId) {
    case "cc-arcade":
      if (command === "/arcade") {
        if (argument === "stop" || argument === "close") return togglePanel(state, false);
        if (argument === "2048") return togglePanel(state, true, "2048");
        return togglePanel(state, true, "games");
      }
      break;
    case "cc-dino":
      if (command === "/dino") return togglePanel(state, argument !== "stop");
      break;
    case "cctop":
      if (command === "/cctop" || command === "/cctop-pane") {
        if (argument === "close") return togglePanel(state, false);
        return togglePanel(state, argumentsText ? true : undefined, argumentsText ? argumentsText[0].toUpperCase() + argumentsText.slice(1) : undefined);
      }
      break;
    case "flowpane":
      if (command === "/flowpane") return togglePanel(state, argumentsText ? true : undefined, argumentsText || undefined);
      break;
    case "mindful-claude":
      if (command === "/breathe") return togglePanel(state, argument !== "off", argumentsText || "pulse");
      break;
    case "context-lens":
      if (command === "/context-lens") return togglePanel(state, argument === "refresh" ? true : undefined, argument === "refresh" ? "Counted" : undefined);
      break;
    case "quota-meter": if (command === "/quota") return togglePanel(state); break;
    case "token-ledger": if (command === "/ledger") return togglePanel(state); break;
    case "budget-guard": if (command === "/guard") return parseGuardCommand(state, argumentsText); break;
    case "mermaid-draw":
      if (command === "/mermaid") {
        if (argument.startsWith("ascii")) return { ...state, panel: { ...state.panel, rendered: argument.endsWith("on") } };
        if (argument.startsWith("color")) return togglePanel(state, true, argument.endsWith("off") ? "Plain" : "Color");
        if (argument.startsWith("lr")) return { ...state, panel: { ...state.panel, vertical: argument.endsWith("off") } };
        return { ...state, notice: "/mermaid ascii on|off · color on|off · lr on|off. The renderer replaces closed Mermaid fences." };
      }
      break;
    case "prompt-queue": if (command === "/q") return parseQueueCommand(state, argumentsText); break;
    case "mission-control": if (command === "/mission") return togglePanel(state, true, argument === "code" ? "Code" : "Who"); break;
    case "md-preview": if (command === "/md" || command === "/mdview") return togglePanel(state, true); break;
    case "now-playing":
      if (command === "/music") {
        if (argument === "next" || argument === "skip") return applyDemoAction(state, { type: "music-next" });
        if (argument === "prev" || argument === "previous" || argument === "back") return applyDemoAction(state, { type: "music-prev" });
        return applyDemoAction(state, { type: "music-toggle" });
      }
      break;
    case "terminal-browser":
      if (command === "/browser") {
        if (argument === "close") return togglePanel(state, false);
        if (argumentsText) return applyDemoAction(togglePanel(state, true), { type: "browser-go", url: argumentsText });
        return togglePanel(state);
      }
      break;
    case "prismantis":
      if (command === "/prismantis") return togglePanel(state, true, argument || "demo");
      break;
    case "flightdeck": if (command === "/flightdeck") return togglePanel(state, argument !== "close", argumentsText || undefined); break;
    case "filetree": if (command === "/filetree") return togglePanel(state, true); break;
    case "prompt-rail":
      if (command === "/prompt-rail") {
        if (argument === "off") return togglePanel(state, false);
        if (argument === "vertical" || argument === "horizontal") return { ...state, panel: { ...state.panel, open: true, vertical: argument === "vertical" } };
        const index = Number(argument.replace("#", "")) - 1;
        if (Number.isInteger(index) && index >= 0) return applyDemoAction(state, { type: "select", index });
        return togglePanel(state, true);
      }
      break;
    case "pull-request-pane": if (command === "/pull-request-pane") return togglePanel(state); break;
    case "taskline":
      if (command === "/taskline") {
        if (argument === "clear" || argument === "clear all") return applyDemoAction(state, { type: "task-clear" });
        if (argument === "demo") return { ...togglePanel(state, true), taskStartedAt: state.clockTick, tasksCleared: false };
        return togglePanel(state, argument !== "hide", argumentsText || undefined);
      }
      break;
    case "clawd-buddy": if (command === "/clawd") return togglePanel(state, argument !== "off", argument || "idle"); break;
  }
  if (command === "/clear") return createSimulation(state.modId);
  return { ...state, notice: "This command is outside this browser demo. Use the listed controls or send any ordinary prompt." };
}

function completeUsage(state: SimulationState): DemoUsage {
  const baseline = state.turnStartingUsage;
  const input = 700 + state.prompt.length * 3;
  const output = 260 + state.prompt.length;
  const cached = 1200;
  return { input, output, cached, cost: Number((baseline.cost + TURN_FIXTURE_COST).toFixed(3)), context: Math.min(99, baseline.context + TURN_CONTEXT_GROWTH), fiveHour: baseline.fiveHour + 2, sevenDay: baseline.sevenDay + 1 };
}

function updateLiveUsage(state: SimulationState): SimulationState {
  if (state.modId !== "cctop" && state.modId !== "flightdeck") return state;
  const finalUsage = completeUsage(state);
  const baseline = state.turnStartingUsage;
  const progress = Math.min(1, state.tick / WORK_TICKS);
  const replyProgress = Math.min(1, Math.max(0, (state.tick - REPLY_TICK) / (WORK_TICKS - REPLY_TICK)));
  return {
    ...state,
    usage: {
      input: Math.floor(finalUsage.input * progress),
      output: Math.floor(finalUsage.output * replyProgress),
      cached: Math.floor(finalUsage.cached * progress),
      cost: Number((baseline.cost + TURN_FIXTURE_COST * progress).toFixed(3)),
      context: Math.min(99, baseline.context + Math.round(TURN_CONTEXT_GROWTH * progress)),
      fiveHour: baseline.fiveHour,
      sevenDay: baseline.sevenDay,
    },
  };
}

export function finalReply(state: SimulationState): string {
  const selectedFile = state.submittedFilePath ? ` I included ${state.submittedFilePath} in this request.` : "";
  const steering = state.injected.length ? ` Steering context: ${state.injected.join("; ")}.` : "";
  if (state.modId === "mermaid-draw" && /diagram|flow|architecture|sequence|graph/i.test(state.prompt)) return `Here is a sample flow for “${state.prompt}”.\n\n\`\`\`mermaid\ngraph LR\n  Request --> Plan --> Result\n\`\`\``;
  return `Finished the local example for “${state.prompt}”. Read src/app.ts, updated the sample project, and checked the result.${selectedFile}${steering} This is a scripted reply; your message stayed in this browser.`;
}

function deliverTool(state: SimulationState, text: string): SimulationState {
  let next = appendEntry(state, "tool", text);
  if (state.steering.length) {
    next = appendEntry(next, "system", `Tool-result context from prompt-queue: ${state.steering.join(" · ")}`);
    next = { ...next, injected: [...next.injected, ...state.steering], steering: [] };
  }
  return next;
}

function guardedTool(state: SimulationState, text: string, fixtureCost: number): SimulationState {
  if (exceedsBudget(state)) return { ...appendEntry(state, "tool", "Tool denied before execution: budget limit reached."), phase: "stopped", notice: "Budget guard stopped this turn before the next tool." };
  const next = deliverTool(state, text);
  if (state.modId !== "budget-guard") return next;
  const cost = Number((state.usage.cost + fixtureCost).toFixed(3));
  return { ...next, usage: { ...state.usage, cost } };
}

function canAdvanceDinosaur(state: SimulationState): boolean {
  if (state.modId !== "cc-dino") return false;
  if (!state.dino.started || state.dino.over) return false;
  return !state.panel.paused;
}

function tickDino(state: SimulationState): SimulationState {
  if (!canAdvanceDinosaur(state)) return state;
  const obstacle = state.dino.obstacle - 1;
  const jumpTicks = Math.max(0, state.dino.jumpTicks - 1);
  const overlapsDinosaur = obstacle >= DINO_LEFT_COLUMN && obstacle < DINO_LEFT_COLUMN + DINO_WIDTH;
  const over = overlapsDinosaur && jumpTicks === 0;
  return { ...state, dino: { ...state.dino, score: state.dino.score + 1, obstacle: obstacle < 0 ? DINO_STARTING_OBSTACLE_COLUMN : obstacle, jumpTicks, over } };
}

export function tickSimulation(previous: SimulationState): SimulationState {
  let state: SimulationState = { ...previous, clockTick: previous.clockTick + 1, playback: { ...previous.playback, position: previous.playback.playing ? (previous.playback.position + SIMULATION_TICK_MS / 1000) % MUSIC_DURATION_SECONDS : previous.playback.position } };
  state = tickDino(state);
  if (state.phase === "decision") {
    if (state.decision === "command" && state.clockTick - state.decisionTick >= COMMAND_TIMEOUT_TICKS) return applyDemoAction(state, { type: "deny" });
    return state;
  }
  if (state.phase !== "working") return dispatchQueuedPrompt(state);
  state = { ...state, tick: state.tick + 1 };
  state = updateLiveUsage(state);
  if (state.tick === READ_TICK) {
    state = guardedTool(state, "◉ Read src/app.ts · 128 lines", 0.006);
  }
  if (state.tick === AGENT_TICK) {
    state = guardedTool(state, "● Agent: inspect the example project · research", 0.006);
    if (state.modId === "flowpane") state = togglePanel(appendEntry(state, "tool", "Workflow fixture: research ×2 → implementation"), true);
  }
  if (state.tick === EDIT_TICK) {
    state = guardedTool(state, state.modId === "md-preview" ? "✎ Edit README.md · +8 −2" : "✎ Edit src/app.ts · +8 −2", 0.014);
    if (state.modId === "md-preview") state = { ...state, notice: "README.md changed · /md to preview" };
  }
  if (state.tick === CHECK_TICK) {
    if (state.modId === "blast-radius" && getHeldCommandFixture(state.prompt)) return { ...state, phase: "decision", decision: "command", decisionTick: state.clockTick, panel: { ...state.panel, open: true } };
    state = guardedTool(state, "$ npm test · sample checks passed", 0.002);
  }
  if (state.tick >= WORK_TICKS) {
    const usage = completeUsage(state);
    const completed = [...state.completed, { prompt: state.prompt, usage, turn: state.turn }].slice(-20);
    state = appendEntry(state, "assistant", finalReply(state));
    return { ...state, phase: "complete", usage, completed, queue: [...state.steering, ...state.queue], steering: [], budget: { ...state.budget, overridden: false }, panel: { ...state.panel, paused: state.modId === "cc-dino" || state.panel.paused } };
  }
  return state;
}

function actOnQueue(state: SimulationState, action: Extract<DemoAction, { index: number }>): SimulationState {
  const index = action.index;
  if (!Number.isInteger(index) || index < 0 || index >= state.queue.length) return state;
  const queue = [...state.queue];
  if (action.type === "queue-up" || action.type === "queue-down") {
    const target = action.type === "queue-up" ? index - 1 : index + 1;
    if (target < 0 || target >= queue.length) return state;
    const item = queue[index]; queue[index] = queue[target]; queue[target] = item;
    return { ...state, queue };
  }
  const [text] = queue.splice(index, 1);
  if (action.type === "queue-now") {
    if (state.phase === "working") return { ...state, queue, steering: [...state.steering, text], notice: "Steering waits for the next successful main tool result." };
    if (state.phase === "decision") return { ...state, notice: "Resolve the pending decision first." };
    return dispatchQueuedPrompt({ ...state, queue: [text, ...queue] });
  }
  return { ...state, queue };
}

function dismissGameCompletion(state: SimulationState): SimulationState {
  if (state.phase !== "complete") return state;
  return { ...state, phase: "idle" };
}

function freshDinosaur(started: boolean): DinoState {
  return { score: 0, obstacle: DINO_STARTING_OBSTACLE_COLUMN, jumpTicks: 0, over: false, started };
}

export function applyDemoAction(state: SimulationState, action: DemoAction): SimulationState {
  switch (action.type) {
    case "open": return togglePanel(state, true);
    case "close": return togglePanel(state, false);
    case "toggle": return togglePanel(state);
    case "tab": return togglePanel(state, true, action.value);
    case "select": return { ...state, panel: { ...state.panel, selection: action.index, tab: state.modId === "flowpane" ? "details" : state.panel.tab } };
    case "navigate": {
      let count = 3;
      if (state.modId === "prompt-rail") count = state.transcript.filter(entry => entry.role === "user").length;
      if (state.modId === "md-preview") count = 2;
      if (!count) return state;
      let currentSelection = state.panel.selection;
      if (currentSelection < 0) currentSelection = state.modId === "prompt-rail" ? count - 1 : 0;
      const remainder = (currentSelection + action.delta) % count;
      const selection = remainder < 0 ? remainder + count : remainder;
      return { ...state, panel: { ...state.panel, selection } };
    }
    case "pause": {
      const next = { ...state, panel: { ...state.panel, paused: !state.panel.paused } };
      if ((state.modId === "cc-arcade" || state.modId === "cc-dino") && !next.panel.paused) return dismissGameCompletion(next);
      return next;
    }
    case "render-toggle": return { ...state, panel: { ...state.panel, rendered: !state.panel.rendered } };
    case "orientation-toggle": return { ...state, panel: { ...state.panel, vertical: !state.panel.vertical } };
    case "reset": return createSimulation(state.modId);
    case "stop": return { ...appendEntry(state, "system", "Claude stopped. No pending tools will run."), phase: "stopped", decision: null, queue: [...state.steering, ...state.queue], steering: [], budget: { ...state.budget, overridden: false } };
    case "replay":
      if (state.modId === "taskline") return { ...state, taskStartedAt: state.clockTick, tasksCleared: false, panel: { ...state.panel, open: true } };
      return startTurn(createSimulation(state.modId), state.prompt || "Improve the example project");
    case "attach": return { ...state, attachment: true };
    case "remove-attachment": return { ...state, attachment: false };
    case "compact": return { ...state, panel: { ...state.panel, tab: "compacted" }, completed: [], usage: { ...state.usage, context: 0 }, notice: "Context compacted. Waiting for the next answer to measure it." };
    case "budget":
      if (!Number.isFinite(action.dollars) || action.dollars < 0) return { ...state, notice: "Use a non-negative budget amount." };
      return { ...state, budget: { ...state.budget, dollars: action.dollars }, notice: `Fixture cost limit $${action.dollars.toFixed(2)}.` };
    case "override": return startTurn({ ...state, budget: { ...state.budget, overridden: true } }, state.prompt);
    case "proceed": {
      if (state.decision !== "command") return state;
      const held = getHeldCommandFixture(state.prompt);
      if (!held) return state;
      return { ...deliverTool(state, `$ ${held.command} · Completed in memory only.`), phase: "working", decision: null };
    }
    case "deny":
      if (state.decision === "budget") return { ...state, phase: "stopped", decision: null, notice: "Prompt was not sent." };
      return { ...deliverTool(state, "$ Command denied. Example files were kept."), phase: "working", decision: null };
    case "queue": return queueText(state, sanitizePrompt(action.text));
    case "queue-clear": return { ...state, queue: [], steering: [] };
    case "queue-remove": case "queue-now": case "queue-up": case "queue-down": case "queue-edit": return actOnQueue(state, action);
    case "music-toggle": return { ...state, playback: { ...state.playback, playing: !state.playback.playing } };
    case "music-next": return { ...state, playback: { playing: true, track: (state.playback.track + 1) % 3, position: 0 } };
    case "music-prev": return { ...state, playback: { playing: true, track: (state.playback.track + 2) % 3, position: 0 } };
    case "arcade-move": return dismissGameCompletion({ ...state, arcade: reduceDemo(state.arcade, { type: "move", direction: action.direction, positionSample: Math.random(), valueSample: Math.random() }), panel: { ...state.panel, tab: "2048" } });
    case "game-restart": return dismissGameCompletion({ ...state, arcade: reduceDemo(state.arcade, { type: "reset", game: createGame() }), dino: freshDinosaur(true), panel: { ...state.panel, paused: false } });
    case "game-undo": return { ...state, arcade: reduceDemo(state.arcade, { type: "undo" }) };
    case "dino-jump": {
      const dinosaur = state.dino.over ? freshDinosaur(true) : state.dino;
      return dismissGameCompletion({ ...state, dino: { ...dinosaur, started: true, jumpTicks: DINO_JUMP_TICKS }, panel: { ...state.panel, paused: false } });
    }
    case "browser-go": return { ...state, browserUrl: action.url.startsWith("local://") ? action.url : "local://example", notice: "Local sample page. The demo does not visit external websites." };
    case "file-hidden": return { ...state, files: { ...state.files, hidden: !state.files.hidden } };
    case "file-size": return { ...state, files: { ...state.files, sizes: !state.files.sizes } };
    case "file-collapse": return { ...state, files: { ...state.files, collapsed: !state.files.collapsed } };
    case "file-search": return { ...state, files: { ...state.files, query: sanitizePrompt(action.text) } };
    case "file-refresh": return { ...state, notice: "Example file tree refreshed." };
    case "review-draft": return { ...state, review: { ...state.review, draft: sanitizePrompt(action.text) } };
    case "review-add": {
      if (!state.review.draft) return { ...state, notice: "Write a comment before adding it." };
      const quotes: Record<number, string> = { 1: "This change makes the handler easier to read", 2: "and adds tests for the empty-input case." };
      const quote = quotes[state.panel.selection];
      const comment = quote ? `Regarding “${quote}”: ${state.review.draft}` : state.review.draft;
      return { ...state, review: { comments: [...state.review.comments, comment].slice(-8), draft: "" }, panel: { ...state.panel, selection: -1 } };
    }
    case "review-remove": return { ...state, review: { ...state.review, comments: state.review.comments.filter((comment, index) => index !== action.index) } };
    case "review-submit": {
      if (state.review.draft || !state.review.comments.length) return { ...state, notice: "Add your draft first. At least one committed comment is required." };
      const next = submitPrompt(state, `Review the sample pull request: ${state.review.comments.join("; ")}`);
      if (next.turn === state.turn) return next;
      return { ...next, review: { comments: [], draft: "" } };
    }
    case "task-clear": return { ...state, tasksCleared: true };
    case "fill-composer": case "copy": return state;
  }
}
