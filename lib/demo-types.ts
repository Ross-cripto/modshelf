import type { DemoId } from "./mod-demos.ts";
import type { DemoState as ArcadeState } from "./arcade-demo.ts";
import type { Direction } from "./cc-arcade-2048.ts";

export type SessionPhase = "idle" | "working" | "decision" | "complete" | "stopped";
export type DemoPlacement = "above-prompt" | "right-pane" | "under-prompt" | "transcript" | "gate";
export type DemoAction =
  | { type: "open" | "close" | "toggle" | "pause" | "reset" | "stop" | "replay" }
  | { type: "tab"; value: string }
  | { type: "select"; index: number }
  | { type: "navigate"; delta: number }
  | { type: "proceed" | "deny" | "override" | "compact" | "attach" | "remove-attachment" }
  | { type: "music-toggle" | "music-next" | "music-prev" | "render-toggle" | "orientation-toggle" | "ascii-toggle" | "md-refresh" | "md-browser" }
  | { type: "queue"; text: string }
  | { type: "queue-remove" | "queue-now" | "queue-up" | "queue-down" | "queue-edit"; index: number }
  | { type: "queue-clear" }
  | { type: "queue-send"; index?: number }
  | { type: "queue-unsteer"; index: number }
  | { type: "queue-move"; from: number; to: number }
  | { type: "budget"; dollars: number }
  | { type: "arcade-move"; direction: Direction }
  | { type: "game-restart" | "game-undo" | "dino-jump" | "dino-duck" | "game-clear-best" }
  | { type: "browser-go"; url: string }
  | { type: "browser-back" | "browser-forward" | "browser-reload" | "browser-menu" | "browser-grab" }
  | { type: "file-hidden" | "file-size" | "file-collapse" | "file-refresh" | "file-up" | "file-cwd" | "review-add" | "review-submit" }
  | { type: "review-quote"; text: string }
  | { type: "task-clear"; all?: boolean }
  | { type: "task-remove"; id: string }
  | { type: "task-check" }
  | { type: "file-search" | "review-draft" | "fill-composer"; text: string }
  | { type: "review-remove"; index: number }
  | { type: "copy"; format: "markdown" | "text" | "code" | "art"; text?: string };

export type DemoButton = { label: string; action: DemoAction; key?: string };
export type DemoRow = { text: string; targets: { column: number; width: number; action: DemoAction; key?: string }[] };
export type DemoPanel = { rows: DemoRow[]; bandRows?: DemoRow[]; status?: string; graphic?: "agents" | "browser" | "attachment" | "markdown" | "files"; graphicOffset?: number; graphicHeight?: number; graphicWidth?: number };
export type DemoDefinition = {
  id: DemoId;
  placement: DemoPlacement;
  startupCommand: string;
  startsOpen: boolean;
  initialTab: string;
  example: string;
  instructions: string;
  limitation: string;
  source: string;
  controls: DemoButton[];
};

export type TranscriptEntry = { id?: number; role: "user" | "tool" | "assistant" | "system"; text: string; turn: number };
export type DemoUsage = { input: number; output: number; cached: number; cost: number; context: number; fiveHour: number; sevenDay: number };
export type CompletedTurn = { prompt: string; usage: DemoUsage; turn: number; completedAtTick?: number; model?: string; durationMs?: number; cacheWrite?: number; subagent?: boolean; costDelta?: number; contextTokens?: number };
export type DinoState = { score: number; best: number; obstacle: number; obstacleKind: "cactus" | "cluster" | "tall" | "bird"; obstacleWidth: number; jumpTicks: number; duckTicks: number; over: boolean; started: boolean };
export type SimulationState = {
  modId: DemoId;
  phase: SessionPhase;
  tick: number;
  clockTick: number;
  turn: number;
  prompt: string;
  submittedFilePath: string | null;
  transcript: TranscriptEntry[];
  nextEntryId: number;
  completed: CompletedTurn[];
  queue: string[];
  lastQueueDispatchTick: number;
  injected: string[];
  usage: DemoUsage;
  turnStartingUsage: DemoUsage;
  panel: { open: boolean; tab: string; selection: number; paused: boolean; rendered: boolean; vertical: boolean; ascii: boolean };
  attachment: boolean;
  playback: { playing: boolean; track: number; position: number };
  budget: { dollars: number; fiveHourLimit: number; sevenDayLimit: number; warnAt: number; overridden: boolean; enabled: boolean; warnOnly: boolean };
  decision: "budget" | "command" | null;
  decisionTick: number;
  steering: string[];
  composerTyping: boolean;
  browserUrl: string;
  browserHistory: string[];
  browserHistoryIndex: number;
  browserMenu: boolean;
  browserGrab: boolean;
  files: { hidden: boolean; sizes: boolean; collapsed: boolean; query: string; atParent: boolean; modified: boolean };
  review: { comments: string[]; draft: string; quote: string };
  taskStartedAt: number;
  tasksCleared: boolean;
  taskClearTick: number | null;
  taskClearAll: boolean;
  taskRemoved: { id: string; tick: number }[];
  taskCheckTicks: number[];
  markdownFiles: string[];
  markdownEditedFiles: string[];
  markdownPair: [string, string] | null;
  mindful: { delaySeconds: number; spinner: boolean };
  flowLayout: string;
  flowRun: { turn: number; tick: number; phase: SessionPhase } | null;
  flightdeckResetTurn: number;
  flightdeckResetEntry: number;
  stoppedAtTick: number | null;
  contextLens?: { tokens?: number; window: number; threshold: number | null; model: string; categories: { name: string; tokens: number; color: string; kind: "used" | "buffer" | "free"; isDeferred: boolean }[]; detail: "summary" | "full" };
  arcade: ArcadeState;
  dino: DinoState;
  notice: string;
};
