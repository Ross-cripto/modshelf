import type { DemoId } from "./mod-demos.ts";
import type { DemoAction, DemoUsage, DinoState, SimulationState, TranscriptEntry } from "./demo-types.ts";
import { createOpeningState, reduceDemo } from "./arcade-demo.ts";
import { createGame } from "./cc-arcade-2048.ts";
import { getFixtureFilePath, getHeldCommandFixture, mermaidReplyFixture } from "./demo-fixtures.ts";
import { isKnownMarkdownPath } from "./demo-markdown.ts";
import { AGENT_TICK, CHECK_TICK, DINO_LEFT_COLUMN, DINO_WIDTH, EDIT_TICK, MAX_PROMPT_LENGTH, MAX_QUEUED_PROMPTS, MAX_TRANSCRIPT_ENTRIES, MUSIC_DURATION_SECONDS, READ_TICK, REPLY_TICK, SIMULATION_TICK_MS, WORK_TICKS } from "./demo-config.ts";

const QUEUE_GAP_TICKS = Math.ceil(5200 / SIMULATION_TICK_MS);
const COMMAND_TIMEOUT_TICKS = Math.ceil(60000 / SIMULATION_TICK_MS);
const DINO_STARTING_OBSTACLE_COLUMN = 24;
const DINO_JUMP_TICKS = 6;
const TURN_FIXTURE_COST = 0.028;
const SUBAGENT_FIXTURE_COST = 0.008;
const TURN_CONTEXT_GROWTH = 8;
const MAX_LEDGER_TURNS = 200;
const TASK_DEMO_IDS = ["demo-stuck", "demo-download", "demo-scan"];
const CONTEXT_WINDOW_TOKENS = 1000000;
const CONTEXT_INITIAL_TOKENS = 45900;
const CONTEXT_GROWTH_TOKENS = 8000;
const CLOSED_ON_START: DemoId[] = ["context-lens", "quota-meter", "token-ledger", "blast-radius", "md-preview", "flowpane", "mission-control"];
const EMPTY_USAGE: DemoUsage = { input: 0, output: 0, cached: 0, cost: 0, context: 0, fiveHour: 0, sevenDay: 0 };
const INITIAL_TABS: Partial<Record<DemoId, string>> = { "cc-arcade": "2048", cctop: "Overview", "mission-control": "Who", "mermaid-draw": "Color", "md-preview": "Single", "taskline": "auto", "mindful-claude": "hrv:random" };

export function sanitizePrompt(text: string): string {
  return text.replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_PROMPT_LENGTH);
}

export function createSimulation(modId: DemoId): SimulationState {
  return {
    modId, phase: "idle", tick: 0, clockTick: 0, turn: 0, prompt: "", submittedFilePath: null,
    nextEntryId: 1, transcript: [{ id: 0, role: "system", text: "Welcome to Claude Code.", turn: 0 }],
    completed: [], queue: [], lastQueueDispatchTick: -QUEUE_GAP_TICKS, injected: [], steering: [], usage: initialUsage(modId), turnStartingUsage: initialUsage(modId),
    panel: { open: !CLOSED_ON_START.includes(modId), tab: INITIAL_TABS[modId] ?? "", selection: -1, paused: false, rendered: modId !== "prismantis", vertical: false, ascii: false },
    attachment: modId === "image-view", composerTyping: false,
    playback: { playing: true, track: 0, position: 0 },
    budget: { dollars: 0, fiveHourLimit: 90, sevenDayLimit: 95, warnAt: 80, overridden: false, enabled: true, warnOnly: false },
    decision: null, decisionTick: 0, browserUrl: "local://example", browserHistory: ["local://example"], browserHistoryIndex: 0, browserMenu: false, browserGrab: false, files: { hidden: true, sizes: false, collapsed: false, query: "", atParent: false, modified: false },
    review: { comments: [], draft: "", quote: "" }, taskStartedAt: 0, tasksCleared: false, taskClearTick: null, taskClearAll: false, taskRemoved: [], taskCheckTicks: [], markdownFiles: [], markdownEditedFiles: [], markdownPair: null,
    mindful: { delaySeconds: 0, spinner: true }, flowLayout: "workflow", flowRun: null, flightdeckResetTurn: 0, flightdeckResetEntry: 0, stoppedAtTick: null,
    arcade: createOpeningState(), dino: freshDinosaur(false), notice: "",
  };
}

export function appendEntry(state: SimulationState, role: TranscriptEntry["role"], text: string): SimulationState {
  const transcript = [...state.transcript, { id: state.nextEntryId, role, text, turn: state.turn }].slice(-MAX_TRANSCRIPT_ENTRIES);
  return { ...state, transcript, nextEntryId: state.nextEntryId + 1 };
}

function initialUsage(modId: DemoId): DemoUsage {
  if (modId === "quota-meter") return { ...EMPTY_USAGE, fiveHour: 42, sevenDay: 18 };
  return { ...EMPTY_USAGE };
}

function exceedsBudget(state: SimulationState): boolean {
  if (state.modId !== "budget-guard") return false;
  if (!state.budget.enabled || state.budget.overridden || state.budget.warnOnly) return false;
  if (state.budget.dollars > 0 && state.usage.cost >= state.budget.dollars) return true;
  if (state.budget.fiveHourLimit > 0 && state.usage.fiveHour >= state.budget.fiveHourLimit) return true;
  return state.budget.sevenDayLimit > 0 && state.usage.sevenDay >= state.budget.sevenDayLimit;
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
    stoppedAtTick: null,
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
  const [command, indexText, destinationText] = argumentsText.split(" ");
  const index = Number(indexText) - 1;
  if (!argumentsText || command === "status" || command === "help") return { ...state, notice: `${state.queue.length} queued. /q text · /q now N · /q rm N · /q clear` };
  if (command === "clear") return applyDemoAction(state, { type: "queue-clear" });
  if (command === "send") {
    if (isTurnRunning(state)) return { ...state, notice: "Queue waits until the main turn ends. /q now N explicitly steers a running turn." };
    return dispatchQueuedPrompt(state);
  }
  if (command === "now") return applyDemoAction(state, { type: "queue-now", index });
  if (command === "mv") return applyDemoAction(state, { type: "queue-move", from: index, to: Number(destinationText) - 1 });
  if (command === "rm") return applyDemoAction(state, { type: "queue-remove", index });
  if (command === "up") return applyDemoAction(state, { type: "queue-up", index });
  if (command === "down") return applyDemoAction(state, { type: "queue-down", index });
  if (command === "edit") return { ...state, notice: "Use the queue Edit button to move that message into the composer." };
  return queueText(state, argumentsText);
}

function parseGuardCommand(state: SimulationState, argumentsText: string): SimulationState {
  const [command, value] = argumentsText.split(" ");
  if (command === "5h" || command === "7d") return setBudgetWindow(state, command, value);
  if (command === "cost") return applyDemoAction(state, { type: "budget", dollars: Number(value) });
  if (command === "override") return { ...state, budget: { ...state.budget, overridden: true }, notice: "Budget override for one main turn." };
  if (command === "off" || command === "on") return { ...state, budget: { ...state.budget, enabled: command === "on" }, notice: `Budget guard ${command}.` };
  if (command === "warn" || command === "block") return { ...state, budget: { ...state.budget, warnOnly: command === "warn" }, notice: `Budget guard: ${command} mode.` };
  return { ...state, notice: `/guard cost N · /guard override · /guard warn · /guard block · /guard off · /guard on. Fixture cost $${state.usage.cost.toFixed(3)}.` };
}

function setBudgetWindow(state: SimulationState, window: "5h" | "7d", rawValue: string | undefined): SimulationState {
  const value = Number(rawValue);
  if (!rawValue || !Number.isFinite(value) || value < 0 || value > 100) {
    return { ...state, notice: "Use a percentage from 0 to 100." };
  }
  if (window === "5h") return { ...state, budget: { ...state.budget, fiveHourLimit: value } };
  return { ...state, budget: { ...state.budget, sevenDayLimit: value } };
}

function openMarkdown(state: SimulationState, argument: string): SimulationState {
  if (argument.startsWith("compare ")) {
    const [, first, second] = argument.split(" ");
    if (!isKnownMarkdownPath(first) || !isKnownMarkdownPath(second)) return { ...state, notice: "Those Markdown files were not found." };
    const markdownFiles = [...state.markdownFiles];
    if (!markdownFiles.includes(first)) markdownFiles.push(first);
    if (!markdownFiles.includes(second)) markdownFiles.push(second);
    return { ...togglePanel(state, true, "Pair"), markdownFiles, markdownPair: [first, second] };
  }
  if (argument && !isKnownMarkdownPath(argument)) return { ...state, notice: "That Markdown file was not found." };
  const markdownFiles = [...state.markdownFiles];
  if (argument && !markdownFiles.includes(argument)) markdownFiles.push(argument);
  if (!markdownFiles.length) return { ...state, notice: "No Markdown edits yet." };
  const selection = argument ? markdownFiles.indexOf(argument) : markdownFiles.length - 1;
  return { ...state, markdownFiles, markdownPair: null, panel: { ...state.panel, open: true, selection, tab: "Single" } };
}

function tasklineCommand(state: SimulationState, argument: string): SimulationState {
  if (argument === "clear" || argument === "clear all") return applyDemoAction(state, { type: "task-clear", all: argument === "clear all" });
  if (argument === "demo") return applyDemoAction(state, { type: "replay" });
  if (argument === "hide") return togglePanel(state, false);
  if (argument === "show") return togglePanel(state, true);
  if (argument === "check") return applyDemoAction(state, { type: "task-check" });
  if (argument.startsWith("rm ")) return applyDemoAction(state, { type: "task-remove", id: argument.slice(3) });
  if (argument === "layout auto") return togglePanel(state, true, "auto");
  if (argument === "layout single") return togglePanel(state, true, "single");
  if (argument === "layout stacked") return togglePanel(state, true, "stacked");
  return { ...state, notice: "/taskline show · hide · layout auto|single|stacked · clear [all] · rm ID · check · demo" };
}

const MINDFUL_EXERCISES: Record<string, string> = { hrv: "hrv", coherent: "hrv", coherence: "hrv", sigh: "sigh", physiological: "sigh", box: "box", "478": "478", relax: "478" };
const MINDFUL_STYLES = ["random", "pulse", "ripples", "dots", "wave"];

function mindfulCommand(state: SimulationState, argument: string): SimulationState {
  const [command, value] = argument.split(" ");
  const [currentExercise, currentStyle] = state.panel.tab.split(":");
  if (!argument || command === "help") return { ...state, notice: `/breathe on|off · hrv|sigh|box|478 · style pulse|ripples|dots|wave|random · delay N · spinner on|off` };
  if (command === "on" || command === "off") return togglePanel(state, command === "on");
  if (MINDFUL_EXERCISES[command]) return togglePanel(state, true, `${MINDFUL_EXERCISES[command]}:${currentStyle || "random"}`);
  const style = command === "style" ? value : command;
  if (MINDFUL_STYLES.includes(style)) return togglePanel(state, true, `${currentExercise || "hrv"}:${style}`);
  if (command === "spinner" && (value === "on" || value === "off")) return { ...state, mindful: { ...state.mindful, spinner: value === "on" } };
  if (command === "delay") {
    const seconds = Number(value);
    if (value && Number.isFinite(seconds) && seconds >= 0) return { ...state, mindful: { ...state.mindful, delaySeconds: seconds } };
  }
  return { ...state, notice: "Unknown breathing setting. Use /breathe help." };
}

function flowpaneCommand(state: SimulationState, argument: string): SimulationState {
  if (argument === "horizontal") return selectFlowLayout(state, "flow-horizontal");
  if (argument === "vertical") return selectFlowLayout(state, "flow-vertical");
  if (argument === "timeline") return selectFlowLayout(state, "flow-timeline");
  if (argument === "list") return selectFlowLayout(state, "flow-list");
  if (argument === "settings" || argument === "about") return togglePanel(state, true, argument);
  if (argument === "close") return togglePanel(state, false);
  return selectFlowLayout(state, state.flowLayout);
}

function isFlowLayout(value: string): boolean {
  return ["workflow", "flow-horizontal", "flow-vertical", "flow-timeline", "flow-list"].includes(value);
}

function selectFlowLayout(state: SimulationState, layout: string): SimulationState {
  return { ...togglePanel(state, true, layout), flowLayout: layout };
}

function advancePlayback(state: SimulationState): SimulationState["playback"] {
  if (!state.playback.playing) return state.playback;
  const position = state.playback.position + SIMULATION_TICK_MS / 1000;
  if (position < MUSIC_DURATION_SECONDS) return { ...state.playback, position };
  return { playing: true, track: (state.playback.track + 1) % 3, position: position - MUSIC_DURATION_SECONDS };
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
      if (command === "/dino") {
        if (argument === "reset") return applyDemoAction(state, { type: "game-clear-best" });
        return togglePanel(state, argument !== "stop");
      }
      break;
    case "cctop":
      if (command === "/cctop-pane") {
        if (argument === "close") return togglePanel(state, false);
        return togglePanel(state, argumentsText ? true : undefined, argumentsText ? argumentsText[0].toUpperCase() + argumentsText.slice(1) : undefined);
      }
      break;
    case "flowpane":
      if (command === "/flowpane") return flowpaneCommand(state, argument);
      break;
    case "mindful-claude":
      if (command === "/breathe") return mindfulCommand(state, argument);
      break;
    case "context-lens":
      if (command === "/context-lens") return togglePanel(state, argument === "refresh" ? true : undefined, argument === "refresh" ? "Counted" : undefined);
      break;
    case "quota-meter": if (command === "/quota") return togglePanel(state); break;
    case "token-ledger": if (command === "/ledger") return togglePanel(state); break;
    case "budget-guard": if (command === "/guard") return parseGuardCommand(state, argumentsText); break;
    case "mermaid-draw":
      if (command === "/mermaid") {
        if (argument === "reset") return { ...state, panel: { ...state.panel, ascii: false, vertical: false, tab: "Color", rendered: true } };
        if (argument.startsWith("ascii")) return { ...state, panel: { ...state.panel, ascii: argument.endsWith("on") } };
        if (argument.startsWith("color")) return togglePanel(state, true, argument.endsWith("off") ? "Plain" : "Color");
        if (argument.startsWith("lr")) return { ...state, panel: { ...state.panel, vertical: argument.endsWith("off") } };
        return { ...state, notice: "/mermaid ascii on|off · color on|off · lr on|off. The renderer replaces closed Mermaid fences." };
      }
      break;
    case "prompt-queue": if (command === "/q") return parseQueueCommand(state, argumentsText); break;
    case "mission-control":
      if (command === "/mission") {
        if (argument === "code") return togglePanel(state, true, "Code");
        if (argument === "who") return togglePanel(state, true, "Who");
        return togglePanel(state, true);
      }
      break;
    case "md-preview": if (command === "/md" || command === "/mdview") return openMarkdown(state, argumentsText); break;
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
    case "flightdeck":
      if (command === "/flightdeck") {
        if (argument === "close") return togglePanel(state, false);
        if (argument === "reset") return { ...state, flightdeckResetTurn: state.turn, flightdeckResetEntry: state.nextEntryId, panel: { ...state.panel, selection: 0 } };
        if (argument.startsWith("layout ")) {
          const layout = argument.slice(7);
          if (["auto", "compact", "wide", "mini"].includes(layout)) return togglePanel(state, true, layout);
          return { ...state, notice: "Choose auto, compact, wide or mini." };
        }
        return togglePanel(state, true);
      }
      break;
    case "filetree":
      if (command === "/filetree") {
        if (argument === "..") return applyDemoAction(togglePanel(state, true), { type: "file-up" });
        if (!argument || argument === ".") return applyDemoAction(togglePanel(state, true), { type: "file-cwd" });
        return { ...state, notice: "That directory is not available in this preview." };
      }
      break;
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
    case "taskline": if (command === "/taskline") return tasklineCommand(state, argument); break;
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
  if (state.modId === "mermaid-draw" && /diagram|flow|architecture|sequence|graph/i.test(state.prompt)) return mermaidReplyFixture(state.prompt);
  if (state.modId === "prismantis" && /table|code|typescript/i.test(state.prompt)) {
    return "| Change | Result |\n| --- | --- |\n| Handler | Simplified |\n| Checks | Passing |\n\n```typescript\nexport function summarize(input: string) {\n  return input.trim();\n}\n```";
  }
  return `Finished “${state.prompt}”. Read src/app.ts, updated the project, and checked the result.${selectedFile}${steering}`;
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
  const duckTicks = Math.max(0, state.dino.duckTicks - 1);
  const overlapsDinosaur = obstacle + state.dino.obstacleWidth > DINO_LEFT_COLUMN && obstacle < DINO_LEFT_COLUMN + DINO_WIDTH;
  const avoidedObstacle = state.dino.obstacleKind === "bird" ? duckTicks > 0 || jumpTicks > 0 : jumpTicks > 0;
  const over = overlapsDinosaur && !avoidedObstacle;
  const nextDino = { ...state.dino, score: state.dino.score + 1, best: Math.max(state.dino.best, state.dino.score + 1), duckTicks, obstacle, jumpTicks, over };
  if (obstacle < -state.dino.obstacleWidth) {
    const obstacleKinds = ["tall", "cactus", "cluster", "bird"] as const;
    const currentIndex = obstacleKinds.indexOf(state.dino.obstacleKind);
    nextDino.obstacleKind = obstacleKinds[(currentIndex + 1) % obstacleKinds.length];
    nextDino.obstacleWidth = nextDino.obstacleKind === "cluster" ? 3 : 1;
    nextDino.obstacle = DINO_STARTING_OBSTACLE_COLUMN;
  }
  return { ...state, dino: nextDino };
}

export function tickSimulation(previous: SimulationState): SimulationState {
  let state: SimulationState = { ...previous, clockTick: previous.clockTick + 1, playback: advancePlayback(previous) };
  state = tickDino(state);
  if (state.phase === "decision") {
    if (state.decision === "command" && state.clockTick - state.decisionTick >= COMMAND_TIMEOUT_TICKS) return applyDemoAction(state, { type: "deny" });
    return state;
  }
  if (state.phase !== "working") return dispatchQueuedPrompt(state);
  state = { ...state, tick: state.tick + 1 };
  if (state.flowRun?.turn === state.turn) state = { ...state, flowRun: { ...state.flowRun, tick: state.tick, phase: state.phase } };
  state = updateLiveUsage(state);
  if (state.tick === READ_TICK) {
    state = guardedTool(state, "◉ Read src/app.ts · 128 lines", 0.006);
  }
  if (state.tick === AGENT_TICK) {
    state = guardedTool(state, "● Agent: inspect the project · research", 0.006);
    if (state.modId === "flowpane") state = { ...togglePanel(appendEntry(state, "tool", "Workflow: research ×2 → implementation"), true), flowRun: { turn: state.turn, tick: state.tick, phase: "working" } };
  }
  if (state.tick === EDIT_TICK) {
    state = guardedTool(state, state.modId === "md-preview" ? `✎ Edit ${markdownEditPath(state)} · +8 −2` : "✎ Edit src/app.ts · +8 −2", 0.014);
    if (state.modId === "filetree" && state.phase === "working") state = { ...state, files: { ...state.files, modified: true } };
    if (state.modId === "md-preview" && state.phase === "working") {
      const file = markdownEditPath(state);
      const markdownFiles = state.markdownFiles.includes(file) ? state.markdownFiles : [...state.markdownFiles, file];
      const markdownEditedFiles = state.markdownEditedFiles.includes(file) ? state.markdownEditedFiles : [...state.markdownEditedFiles, file];
      state = { ...state, markdownFiles, markdownEditedFiles, notice: `${file} changed · /md to preview` };
    }
  }
  if (state.tick === CHECK_TICK) {
    if (state.modId === "blast-radius" && getHeldCommandFixture(state.prompt)) return { ...state, phase: "decision", decision: "command", decisionTick: state.clockTick, panel: { ...state.panel, open: true } };
    state = guardedTool(state, "$ npm test · checks passed", 0.002);
  }
  if (state.tick === REPLY_TICK && state.modId === "token-ledger") state = recordLedgerSubagent(state);
  if (state.tick >= WORK_TICKS) {
    const contextLens = state.modId === "context-lens" ? contextFixture(state) : state.contextLens;
    let usage = completeUsage(state);
    if (contextLens?.tokens !== undefined) usage = { ...usage, context: Math.round(contextLens.tokens / contextLens.window * 100) };
    const previousCost = state.completed.at(-1)?.usage.cost ?? state.turnStartingUsage.cost;
    const costDelta = Number((usage.cost - previousCost).toFixed(3));
    const recordedTurn = state.modId === "token-ledger" ? (state.completed.at(-1)?.turn ?? 0) + 1 : state.turn;
    const completed = [...state.completed, { prompt: state.prompt, usage, turn: recordedTurn, completedAtTick: state.clockTick, model: "sonnet-4-5", durationMs: WORK_TICKS * SIMULATION_TICK_MS, cacheWrite: 0, subagent: false, costDelta, contextTokens: contextLens?.tokens }].slice(-MAX_LEDGER_TURNS);
    state = appendEntry(state, "assistant", finalReply(state));
    const flowRun = state.flowRun?.turn === state.turn ? { ...state.flowRun, phase: "complete" as const } : state.flowRun;
    return { ...state, phase: "complete", flowRun, usage, completed, contextLens, queue: [...state.steering, ...state.queue], steering: [], budget: { ...state.budget, overridden: false }, panel: { ...state.panel, paused: state.modId === "cc-dino" || state.panel.paused } };
  }
  return state;
}

function contextFixture(state: SimulationState): NonNullable<SimulationState["contextLens"]> {
  const growth = state.completed.length * CONTEXT_GROWTH_TOKENS;
  const tokens = CONTEXT_INITIAL_TOKENS + growth;
  return { window: CONTEXT_WINDOW_TOKENS, threshold: 800000, model: "claude-opus-5", tokens, detail: "summary", categories: [
    { name: "Messages", tokens: 22400 + growth, color: "#5aa9ff", kind: "used", isDeferred: false },
    { name: "System tools", tokens: 14200, color: "#3ddc84", kind: "used", isDeferred: false },
    { name: "Memory files", tokens: 4900, color: "#c586e8", kind: "used", isDeferred: false },
    { name: "System prompt", tokens: 3100, color: "#e3c46b", kind: "used", isDeferred: false },
    { name: "Autocompact buffer", tokens: 45000, color: "#555555", kind: "buffer", isDeferred: false },
    { name: "Free space", tokens: CONTEXT_WINDOW_TOKENS - tokens - 45000, color: "#333333", kind: "free", isDeferred: false },
  ] };
}

function recordLedgerSubagent(state: SimulationState): SimulationState {
  const usage = { ...state.usage, input: 400, output: 100, cached: 300, cost: Number((state.turnStartingUsage.cost + SUBAGENT_FIXTURE_COST).toFixed(3)) };
  const completed = [...state.completed, { prompt: "Inspect the project", usage, turn: (state.completed.at(-1)?.turn ?? 0) + 1, completedAtTick: state.clockTick, model: "sonnet-4-5", durationMs: (REPLY_TICK - AGENT_TICK) * SIMULATION_TICK_MS, cacheWrite: 0, subagent: true, costDelta: SUBAGENT_FIXTURE_COST }].slice(-MAX_LEDGER_TURNS);
  return { ...state, usage, completed };
}

function markdownEditPath(state: SimulationState): string {
  if (state.turn > 1) return "CONTRIBUTING.md";
  return "README.md";
}

function moveQueuedPrompt(state: SimulationState, from: number, to: number): SimulationState {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return state;
  if (from < 0 || to < 0) return state;
  if (from >= state.queue.length || to >= state.queue.length) return state;
  const queue = [...state.queue];
  const [text] = queue.splice(from, 1);
  queue.splice(to, 0, text);
  return { ...state, queue };
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
  return { score: 0, best: 0, duckTicks: 0, obstacle: DINO_STARTING_OBSTACLE_COLUMN, obstacleKind: "tall", obstacleWidth: 1, jumpTicks: 0, over: false, started };
}

export function applyDemoAction(state: SimulationState, action: DemoAction): SimulationState {
  switch (action.type) {
    case "open":
      if (state.modId === "md-preview") return openMarkdown(state, "");
      return togglePanel(state, true);
    case "close": return togglePanel(state, false);
    case "toggle": return togglePanel(state);
    case "tab":
      if (state.modId === "flowpane" && isFlowLayout(action.value)) return selectFlowLayout(state, action.value);
      if (state.modId === "md-preview" && action.value === "Before") return { ...togglePanel(state, true, action.value), markdownPair: null };
      return togglePanel(state, true, action.value);
    case "select": return { ...state, panel: { ...state.panel, selection: action.index, tab: state.modId === "flowpane" ? "details" : state.panel.tab } };
    case "navigate": {
      let count = 3;
      if (state.modId === "prompt-rail") count = state.transcript.filter(entry => entry.role === "user").length;
      if (state.modId === "md-preview") count = state.markdownFiles.length;
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
    case "ascii-toggle": return { ...state, panel: { ...state.panel, ascii: !state.panel.ascii } };
    case "md-refresh": return { ...state, notice: "Markdown preview refreshed." };
    case "md-browser": return togglePanel(state, true, "Browser");
    case "render-toggle": return { ...state, panel: { ...state.panel, rendered: !state.panel.rendered } };
    case "orientation-toggle": return { ...state, panel: { ...state.panel, vertical: !state.panel.vertical } };
    case "reset": return createSimulation(state.modId);
    case "stop": {
      const flowRun = state.flowRun?.turn === state.turn ? { ...state.flowRun, phase: "stopped" as const } : state.flowRun;
      return { ...appendEntry(state, "system", "Claude stopped. No pending tools will run."), phase: "stopped", flowRun, stoppedAtTick: state.clockTick, decision: null, queue: [...state.steering, ...state.queue], steering: [], budget: { ...state.budget, overridden: false } };
    }
    case "replay":
      if (state.modId === "taskline") return { ...state, taskStartedAt: state.clockTick, tasksCleared: false, taskClearTick: null, taskClearAll: false, taskRemoved: [], taskCheckTicks: [], panel: { ...state.panel, open: true } };
      return startTurn(createSimulation(state.modId), state.prompt || "Improve the example project");
    case "attach": return { ...state, attachment: true };
    case "remove-attachment": return { ...state, attachment: false };
    case "compact": return { ...state, contextLens: undefined, panel: { ...state.panel, tab: "compacted" }, completed: [], usage: { ...state.usage, context: 0 }, notice: "Context compacted. Waiting for the next answer to measure it." };
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
    case "queue-send":
      if (isTurnRunning(state)) return { ...state, notice: "Claude is working. The message remains queued." };
      if (action.index === undefined) return dispatchQueuedPrompt(state);
      return actOnQueue(state, { type: "queue-now", index: action.index });
    case "queue-unsteer": return { ...state, steering: state.steering.filter((text, index) => index !== action.index) };
    case "queue-move": return moveQueuedPrompt(state, action.from, action.to);
    case "queue-clear": return { ...state, queue: [], steering: [] };
    case "queue-remove": case "queue-now": case "queue-up": case "queue-down": case "queue-edit": return actOnQueue(state, action);
    case "music-toggle": return { ...state, playback: { ...state.playback, playing: !state.playback.playing } };
    case "music-next": return { ...state, playback: { playing: true, track: (state.playback.track + 1) % 3, position: 0 } };
    case "music-prev": return { ...state, playback: { playing: true, track: (state.playback.track + 2) % 3, position: 0 } };
    case "arcade-move": return dismissGameCompletion({ ...state, arcade: reduceDemo(state.arcade, { type: "move", direction: action.direction, positionSample: Math.random(), valueSample: Math.random() }), panel: { ...state.panel, tab: "2048" } });
    case "game-restart": return dismissGameCompletion({ ...state, arcade: reduceDemo(state.arcade, { type: "reset", game: createGame() }), dino: { ...freshDinosaur(true), best: state.dino.best }, panel: { ...state.panel, paused: false } });
    case "game-undo": return { ...state, arcade: reduceDemo(state.arcade, { type: "undo" }) };
    case "game-clear-best": return { ...state, dino: { ...state.dino, best: 0 }, notice: "Best score reset." };
    case "dino-duck": return { ...state, dino: { ...state.dino, duckTicks: 3 } };
    case "dino-jump": {
      const dinosaur = state.dino.over ? { ...freshDinosaur(true), best: state.dino.best } : state.dino;
      return dismissGameCompletion({ ...state, dino: { ...dinosaur, started: true, jumpTicks: DINO_JUMP_TICKS }, panel: { ...state.panel, paused: false } });
    }
    case "browser-go": {
      const browserUrl = action.url === "local://about" ? action.url : "local://example";
      if (browserUrl === state.browserUrl) return state;
      const browserHistory = [...state.browserHistory.slice(0, state.browserHistoryIndex + 1), browserUrl];
      return { ...state, browserUrl, browserHistory, browserHistoryIndex: browserHistory.length - 1, browserMenu: false, notice: "" };
    }
    case "browser-back": return navigateBrowser(state, -1);
    case "browser-forward": return navigateBrowser(state, 1);
    case "browser-reload": return { ...state, browserMenu: false, notice: "Page reloaded." };
    case "browser-menu": return { ...state, browserMenu: !state.browserMenu };
    case "browser-grab": return { ...state, browserGrab: !state.browserGrab, browserMenu: false };
    case "file-hidden": return { ...state, files: { ...state.files, hidden: !state.files.hidden } };
    case "file-size": return { ...state, files: { ...state.files, sizes: !state.files.sizes } };
    case "file-collapse": return { ...state, files: { ...state.files, collapsed: !state.files.collapsed } };
    case "file-search": return { ...state, files: { ...state.files, query: sanitizePrompt(action.text) } };
    case "file-refresh": return { ...state, notice: "File tree refreshed." };
    case "file-up": return { ...state, files: { ...state.files, atParent: true }, panel: { ...state.panel, selection: -1 } };
    case "file-cwd": return { ...state, files: { ...state.files, atParent: false }, panel: { ...state.panel, selection: -1 } };
    case "review-quote": return { ...state, review: { ...state.review, quote: sanitizePrompt(action.text) } };
    case "review-draft": return { ...state, review: { ...state.review, draft: sanitizePrompt(action.text) } };
    case "review-add": {
      if (!state.review.draft) return { ...state, notice: "Write a comment before adding it." };
      const quotes: Record<number, string> = { 1: "This change makes the handler easier to read", 2: "and adds tests for the empty-input case." };
      const quote = state.review.quote || quotes[state.panel.selection];
      const comment = quote ? `Regarding “${quote}”: ${state.review.draft}` : state.review.draft;
      return { ...state, review: { comments: [...state.review.comments, comment].slice(-8), draft: "", quote: "" }, panel: { ...state.panel, selection: -1 } };
    }
    case "review-remove": return { ...state, review: { ...state.review, comments: state.review.comments.filter((comment, index) => index !== action.index) } };
    case "review-submit": {
      if (state.review.draft || !state.review.comments.length) return { ...state, notice: "Add your draft first. At least one committed comment is required." };
      const next = submitPrompt(state, `Review the sample pull request: ${state.review.comments.join("; ")}`);
      if (next.turn === state.turn) return next;
      return { ...next, review: { comments: [], draft: "", quote: "" } };
    }
    case "task-clear": return { ...state, tasksCleared: true, taskClearTick: state.clockTick, taskClearAll: action.all ?? false };
    case "task-remove":
      if (!TASK_DEMO_IDS.includes(action.id)) return { ...state, notice: "Task not found." };
      return { ...state, taskRemoved: [...state.taskRemoved.filter(removed => removed.id !== action.id), { id: action.id, tick: state.clockTick }] };
    case "task-check": return { ...state, taskCheckTicks: [...state.taskCheckTicks, state.clockTick] };
    case "fill-composer": case "copy": return state;
  }
}

function navigateBrowser(state: SimulationState, direction: number): SimulationState {
  const browserHistoryIndex = state.browserHistoryIndex + direction;
  if (browserHistoryIndex < 0 || browserHistoryIndex >= state.browserHistory.length) return state;
  return { ...state, browserHistoryIndex, browserUrl: state.browserHistory[browserHistoryIndex], browserMenu: false };
}
