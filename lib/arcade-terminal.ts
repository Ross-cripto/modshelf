import { BOARD_SIZE, type Direction, type Game2048 } from "./cc-arcade-2048.ts";
import { getKeyDirection, type DemoState } from "./arcade-demo.ts";
const ESCAPE = "\u001b[";
const RESET = `${ESCAPE}0m`;
const BORDER_COLUMNS = 27;
const CELL_COLUMNS = 6;
const MAX_COMMAND_LENGTH = 80;
const MIN_TERMINAL_ROWS = 16;
const TILE_COLORS: Record<number, string> = {
  2: "37", 4: "97", 8: "33", 16: "93", 32: "38;2;255;136;0", 64: "31",
  128: "35", 256: "95", 512: "34", 1024: "36", 2048: "32",
};
export type TerminalView = "game" | "picker" | "closed";
export type TerminalFocus = "game" | "prompt";
export type TerminalFrameOptions = { state: DemoState; view: TerminalView; focus: TerminalFocus; command: string; feedback: string; columns: number; rows: number; lastCommand?: string };
export type TerminalFrame = { output: string; actionRow: number; boardTopRow: number; promptRow: number; view: TerminalView; columns: number };

export function buildTerminalUpdate(current: TerminalFrame, previous?: TerminalFrame): string {
  const lines = current.output.split("\r\n");
  const previousLines = previous?.output.split("\r\n") ?? [];
  const needsFullPaint = !previous || previous.columns !== current.columns || previousLines.length !== lines.length;
  let output = previous ? "" : "\u001b[?1049h";
  if (needsFullPaint) output += "\u001b[?7l\u001b[H\u001b[2J";
  for (let rowIndex = 0; rowIndex < lines.length; rowIndex++) {
    if (needsFullPaint || lines[rowIndex] !== previousLines[rowIndex]) {
      output += `\u001b[${rowIndex + 1};1H\u001b[2K${lines[rowIndex]}`;
    }
  }
  return output;
}
export type TerminalKeyIntent =
  | { type: "move"; direction: Direction }
  | { type: "restart" | "prompt" | "submit" | "backspace" | "browser" | "ignore" | "text" };

export function parseTerminalMouse(input: string): { column: number; row: number } | null {
  const match = /^\u001b\[<0;([1-9]\d*);([1-9]\d*)M$/.exec(input);
  if (!match) return null;
  return { column: Number(match[1]), row: Number(match[2]) };
}

function colorText(text: string, color: string): string {
  return `${ESCAPE}${color}m${text}${RESET}`;
}

function formatCell(value: number): string {
  const label = String(value || "·").padStart(CELL_COLUMNS - 1) + " ";
  if (value === 0) return colorText(label, "90");
  const color = TILE_COLORS[value] ?? "92";
  if (value >= 128) return colorText(label, `1;${color}`);
  return colorText(label, color);
}

export function buildBoardLines(game: Game2048): string[] {
  const borderColor = game.over ? "31" : "33";
  const horizontalBorder = "─".repeat(BORDER_COLUMNS - 2);
  const lines = [colorText(`╭${horizontalBorder}╮`, borderColor)];
  for (let rowIndex = 0; rowIndex < BOARD_SIZE; rowIndex++) {
    let row = colorText("│", borderColor);
    for (let columnIndex = 0; columnIndex < BOARD_SIZE; columnIndex++) {
      row += formatCell(game.cells[rowIndex * BOARD_SIZE + columnIndex]);
    }
    lines.push(row + colorText(" │", borderColor));
  }
  lines.push(colorText(`╰${horizontalBorder}╯`, borderColor));
  return lines;
}

function gameStatus(state: DemoState): string {
  const game = state.game;
  if (game.over) return `2048 · no moves left · score ${game.score} · r plays again · best ${state.bestScore}`;
  let text = `2048 · score ${game.score}`;
  if (game.won) text += " · 2048 reached, keep going";
  return `${text} · click here, then arrows or wasd · r restarts · best ${state.bestScore}`;
}

export function buildTerminalFrame(options: TerminalFrameOptions): TerminalFrame {
  const rows = Math.max(MIN_TERMINAL_ROWS, options.rows);
  const columns = Math.max(BORDER_COLUMNS, options.columns);
  const lines = Array<string>(rows).fill("");
  const actionRow = rows - 10;
  const boardTopRow = actionRow + 1;
  const promptRow = rows - 1;
  lines[0] = colorText("Claude Code", "1");
  lines[1] = colorText("cc-arcade · browser preview".slice(0, columns), "90");
  lines[3] = colorText(`❯ ${options.lastCommand ?? "/arcade 2048"}`.slice(0, columns), "90");
  lines[4] = colorText((options.feedback || "cc-arcade: 2048 · click the board to play · Esc returns to the prompt").slice(0, columns), "90");
  if (options.view === "game") {
    lines[actionRow - 1] = colorText("[ ← games ] [ close ]", "1");
    const board = buildBoardLines(options.state.game);
    for (let lineIndex = 0; lineIndex < board.length; lineIndex++) {
      lines[boardTopRow - 1 + lineIndex] = board[lineIndex];
    }
    lines[rows - 4] = colorText(gameStatus(options.state).slice(0, columns), "90");
  }
  if (options.view === "picker") {
    lines[actionRow - 1] = colorText("[ 2048 ] [ close ]", "1");
    lines[actionRow] = colorText("This preview includes 2048.".slice(0, columns), "90");
  }
  lines[rows - 3] = colorText("─".repeat(columns), "90");
  lines[promptRow - 1] = `❯ ${options.command.slice(-(columns - 3))}`;
  lines[rows - 1] = colorText("─".repeat(columns), "90");
  return { output: lines.join("\r\n"), actionRow, boardTopRow, promptRow, view: options.view, columns };
}

export function getTerminalHitTarget(column: number, row: number, frame: TerminalFrame): "games" | "close" | "board" | "prompt" | "start" | "none" {
  if (row === frame.actionRow && frame.view === "game") {
    if (column <= 11) return "games";
    if (column >= 13 && column <= 21) return "close";
  }
  if (row === frame.actionRow && frame.view === "picker") {
    if (column <= 8) return "start";
    if (column >= 10 && column <= 18) return "close";
  }
  const isBoardRow = row >= frame.boardTopRow && row < frame.boardTopRow + BOARD_SIZE + 2;
  if (frame.view === "game" && isBoardRow && column <= BORDER_COLUMNS) return "board";
  if (row >= frame.promptRow) return "prompt";
  return "none";
}

export function getTerminalKeyIntent(key: string, focus: TerminalFocus): TerminalKeyIntent {
  if (key === "Tab") return { type: "browser" };
  if (focus === "game") {
    const direction = getKeyDirection(key);
    if (direction) return { type: "move", direction };
    if (key.toLowerCase() === "r") return { type: "restart" };
    if (key === "Escape") return { type: "prompt" };
    return { type: "ignore" };
  }
  if (key === "Enter") return { type: "submit" };
  if (key === "Backspace") return { type: "backspace" };
  if (key.length === 1) return { type: "text" };
  return { type: "ignore" };
}

export function parseArcadeCommand(command: string): "start" | "picker" | "close" | "unsupported" {
  const normalized = command.trim().toLowerCase().replace(/\s+/g, " ");
  if (normalized === "/arcade 2048") return "start";
  if (normalized === "/arcade") return "picker";
  if (normalized === "/arcade stop") return "close";
  return "unsupported";
}

export function appendCommandText(current: string, input: string): string {
  const withoutAnsi = input.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
  const printable = withoutAnsi.replace(/[^\x20-\x7e]/g, "");
  return (current + printable).slice(0, MAX_COMMAND_LENGTH);
}
