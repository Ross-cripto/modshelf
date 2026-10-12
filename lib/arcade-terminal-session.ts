import type { Terminal } from "@xterm/xterm";
import { createGame, type Direction } from "./cc-arcade-2048";
import { createOpeningState, reduceDemo, type DemoState, type DemoAction } from "./arcade-demo";
import {
  appendCommandText, buildTerminalFrame, buildTerminalUpdate, getTerminalHitTarget, getTerminalKeyIntent,
  parseArcadeCommand, parseTerminalMouse, type TerminalFocus, type TerminalFrame, type TerminalView,
} from "./arcade-terminal";

export type TerminalSnapshot = { state: DemoState; view: TerminalView; focus: TerminalFocus };
export type ArcadeTerminalSession = {
  move: (direction: Direction) => void;
  restart: () => void;
  undo: () => void;
  focusGame: () => void;
  render: () => void;
  hitTarget: (column: number, row: number) => string;
  dispose: () => void;
};

export function createArcadeTerminalSession(terminal: Terminal, onChange: (snapshot: TerminalSnapshot) => void): ArcadeTerminalSession {
  let state = createOpeningState();
  let view: TerminalView = "game";
  let focus: TerminalFocus = "prompt";
  let command = "";
  let lastCommand = "/arcade 2048";
  let feedback = "";
  let frame: TerminalFrame | undefined;

  function render(columns = terminal.cols, rows = terminal.rows) {
    const nextFrame = buildTerminalFrame({ state, view, focus, command, lastCommand, feedback, columns, rows });
    const update = buildTerminalUpdate(nextFrame, frame);
    frame = nextFrame;
    const promptColumn = Math.min(columns, command.length + 3);
    const cursor = focus === "prompt" ? "\u001b[?25h" : "\u001b[?25l";
    terminal.write(`\u001b[?1000h\u001b[?1006h${update}\u001b[${frame.promptRow};${promptColumn}H${cursor}`);
    onChange({ state, view, focus });
  }

  function applyAction(action: DemoAction) {
    state = reduceDemo(state, action);
    render();
  }

  function focusGame() {
    if (view !== "game") return;
    focus = "game";
    terminal.focus();
    render();
  }

  function move(direction: Direction) {
    if (view !== "game") return;
    focus = "game";
    applyAction({ type: "move", direction, positionSample: Math.random(), valueSample: Math.random() });
    terminal.focus();
  }

  function restart() {
    view = "game";
    focus = "game";
    feedback = "";
    applyAction({ type: "reset", game: createGame() });
    terminal.focus();
  }

  function undo() {
    if (view !== "game") return;
    focus = "game";
    applyAction({ type: "undo" });
    terminal.focus();
  }

  function showPicker() {
    view = "picker";
    focus = "prompt";
    feedback = "Pick 2048. Install cc-arcade for the other games.";
    render();
  }

  function closeGame() {
    view = "closed";
    focus = "prompt";
    feedback = "arcade closed";
    render();
  }

  function submitCommand() {
    if (!command.trim()) return;
    const intent = parseArcadeCommand(command);
    lastCommand = command;
    command = "";
    if (intent === "start") {
      view = "game";
      focus = "prompt";
      feedback = "cc-arcade: 2048 · click the board to play · Esc returns to the prompt";
      applyAction({ type: "reset", game: createGame() });
      return;
    }
    if (intent === "picker") { showPicker(); return; }
    if (intent === "close") { closeGame(); return; }
    feedback = "Preview commands: /arcade, /arcade 2048, /arcade stop";
    render();
  }

  function hitTarget(column: number, row: number): string {
    if (!frame) return "none";
    return getTerminalHitTarget(column, row, frame);
  }

  function handleData(input: string) {
    const mouse = parseTerminalMouse(input);
    if (mouse) {
      const target = hitTarget(mouse.column, mouse.row);
      if (target === "games") showPicker();
      if (target === "close") closeGame();
      if (target === "start") { restart(); focus = "prompt"; render(); }
      if (target === "board") focusGame();
      if (target === "prompt") { focus = "prompt"; render(); }
      return;
    }
    if (input.startsWith("\u001b") || focus !== "prompt") return;
    command = appendCommandText(command, input);
    render();
  }

  function handleKey(event: KeyboardEvent): boolean {
    if (event.type !== "keydown") return true;
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    const intent = getTerminalKeyIntent(event.key, focus);
    if (intent.type === "browser") return false;
    if (intent.type === "text") return true;
    event.preventDefault();
    if (intent.type === "move") move(intent.direction);
    if (intent.type === "restart") restart();
    if (intent.type === "prompt") { focus = "prompt"; render(); }
    if (intent.type === "submit") submitCommand();
    if (intent.type === "backspace") { command = command.slice(0, -1); render(); }
    return false;
  }

  terminal.attachCustomKeyEventHandler(handleKey);
  terminal.attachCustomWheelEventHandler(() => false);
  const inputListener = terminal.onData(handleData);
  const resizeListener = terminal.onResize(({ cols, rows }) => render(cols, rows));
  render();
  return { move, restart, undo, focusGame, render, hitTarget, dispose() { inputListener.dispose(); resizeListener.dispose(); } };
}
