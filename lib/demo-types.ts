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
  | { type: "music-toggle" | "music-next" | "music-prev" | "render-toggle" | "orientation-toggle" }
  | { type: "queue"; text: string }
  | { type: "queue-remove" | "queue-now" | "queue-up" | "queue-down" | "queue-edit"; index: number }
  | { type: "queue-clear" }
  | { type: "budget"; dollars: number }
  | { type: "arcade-move"; direction: Direction }
  | { type: "game-restart" | "game-undo" | "dino-jump" }
  | { type: "browser-go"; url: string }
  | { type: "file-hidden" | "file-size" | "file-collapse" | "file-refresh" | "review-add" | "review-submit" | "task-clear" }
  | { type: "file-search" | "review-draft" | "fill-composer"; text: string }
  | { type: "review-remove"; index: number }
  | { type: "copy"; format: "markdown" | "text" | "code" };

export type DemoButton = { label: string; action: DemoAction; key?: string };
export type DemoRow = { text: string; targets: { column: number; width: number; action: DemoAction; key?: string }[] };
export type DemoPanel = { rows: DemoRow[]; status?: string; graphic?: "agents" | "browser" | "attachment" | "markdown" | "files"; graphicOffset?: number; graphicHeight?: number; graphicWidth?: number };
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
export type CompletedTurn = { prompt: string; usage: DemoUsage; turn: number };
export type DinoState = { score: number; obstacle: number; jumpTicks: number; over: boolean; started: boolean };
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
  panel: { open: boolean; tab: string; selection: number; paused: boolean; rendered: boolean; vertical: boolean };
  attachment: boolean;
  playback: { playing: boolean; track: number; position: number };
  budget: { dollars: number; overridden: boolean; enabled: boolean; warnOnly: boolean };
  decision: "budget" | "command" | null;
  decisionTick: number;
  steering: string[];
  composerTyping: boolean;
  browserUrl: string;
  files: { hidden: boolean; sizes: boolean; collapsed: boolean; query: string };
  review: { comments: string[]; draft: string };
  taskStartedAt: number;
  tasksCleared: boolean;
  arcade: ArcadeState;
  dino: DinoState;
  notice: string;
};
