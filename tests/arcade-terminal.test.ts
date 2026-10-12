import test from "node:test";
import assert from "node:assert/strict";
import { buildBoardLines, buildTerminalFrame, buildTerminalUpdate, getTerminalHitTarget, getTerminalKeyIntent, parseArcadeCommand, appendCommandText, parseTerminalMouse } from "../lib/arcade-terminal.ts";
import { createDemoState } from "../lib/arcade-demo.ts";

function stripAnsi(text: string): string {
  return text.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

test("the live terminal board preserves the upstream padded cells, dots and 27-column border", () => {
  const game = { cells: [0, 2, 8, 128, 4, 16, 32, 64, 256, 512, 1024, 2048, 0, 0, 0, 0], score: 100, won: true, over: false };
  const lines = buildBoardLines(game);
  assert.deepEqual(lines.map(stripAnsi), [
    "╭─────────────────────────╮",
    "│    ·     2     8   128  │",
    "│    4    16    32    64  │",
    "│  256   512  1024  2048  │",
    "│    ·     ·     ·     ·  │",
    "╰─────────────────────────╯",
  ]);
  assert.ok(lines[1].includes("\u001b[33m    8 "));
  assert.ok(lines[1].includes("\u001b[1;35m  128 "));
  assert.ok(lines[2].includes("\u001b[38;2;255;136;0m   32 "));
  assert.ok(buildBoardLines({ ...game, over: true })[0].startsWith("\u001b[31m"));
});

test("frames place the game directly above a visible prompt and never wrap past the terminal width", () => {
  const state = createDemoState({ cells: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], score: 48, won: false, over: false });
  const frame = buildTerminalFrame({ state, view: "game", focus: "prompt", command: "/arcade", feedback: "", columns: 40, rows: 20 });
  const plain = stripAnsi(frame.output).split("\r\n");
  assert.equal(plain.length, 20);
  assert.ok(plain.every((line) => line.length <= 40));
  assert.equal(plain[9], "[ ← games ] [ close ]");
  assert.equal(plain[10], "╭─────────────────────────╮");
  assert.ok(plain[16].startsWith("2048 · score 48"));
  assert.equal(plain[18], "❯ /arcade");
  assert.deepEqual(getTerminalHitTarget(4, 10, frame), "games");
  assert.deepEqual(getTerminalHitTarget(16, 10, frame), "close");
  assert.equal(getTerminalHitTarget(10, 13, frame), "board");
  assert.equal(getTerminalHitTarget(4, 19, frame), "prompt");
});

test("picker and closed states remove the board and retain the command prompt", () => {
  const state = createDemoState({ cells: Array(16).fill(0), score: 0, won: false, over: false });
  const picker = buildTerminalFrame({ state, view: "picker", focus: "prompt", command: "", feedback: "", columns: 80, rows: 20 });
  assert.ok(stripAnsi(picker.output).includes("[ 2048 ] [ close ]"));
  assert.equal(getTerminalHitTarget(4, picker.actionRow, picker), "start");
  const closed = buildTerminalFrame({ state, view: "closed", focus: "prompt", command: "", feedback: "arcade closed", columns: 80, rows: 20 });
  assert.ok(!closed.output.includes("╭"));
  assert.ok(stripAnsi(closed.output).includes("arcade closed"));
  assert.ok(stripAnsi(closed.output).includes("❯ "));
});

test("a 17-row terminal retains its header and prompt without scrolling the frame", () => {
  const state = createDemoState({ cells: Array(16).fill(0), score: 0, won: false, over: false });
  const frame = buildTerminalFrame({ state, view: "game", focus: "prompt", command: "", feedback: "", columns: 80, rows: 17 });
  const lines = stripAnsi(frame.output).split("\r\n");
  assert.equal(lines.length, 17);
  assert.equal(lines[0], "Claude Code");
  assert.equal(lines[15], "❯ ");
});

test("arrows and R control only a focused game; Escape returns to the prompt", () => {
  assert.deepEqual(getTerminalKeyIntent("ArrowUp", "game"), { type: "move", direction: "up" });
  assert.deepEqual(getTerminalKeyIntent("R", "game"), { type: "restart" });
  assert.deepEqual(getTerminalKeyIntent("Escape", "game"), { type: "prompt" });
  assert.deepEqual(getTerminalKeyIntent("ArrowUp", "prompt"), { type: "ignore" });
  assert.deepEqual(getTerminalKeyIntent("r", "prompt"), { type: "text" });
  assert.deepEqual(getTerminalKeyIntent("Enter", "prompt"), { type: "submit" });
  assert.deepEqual(getTerminalKeyIntent("Tab", "game"), { type: "browser" });
});

test("preview commands select the game, picker or close without executing arbitrary input", () => {
  assert.equal(parseArcadeCommand(" /arcade 2048 "), "start");
  assert.equal(parseArcadeCommand("/arcade"), "picker");
  assert.equal(parseArcadeCommand("/arcade stop"), "close");
  assert.equal(parseArcadeCommand("rm -rf /"), "unsupported");
  assert.equal(parseArcadeCommand("/arcade 2048; touch file"), "unsupported");
  assert.equal(appendCommandText("/arcade ", "2048\n\u001b[31m"), "/arcade 2048");
  assert.equal(appendCommandText("a".repeat(78), "12345").length, 80);
});

test("terminal mouse reports activate only a left-button press with valid cell coordinates", () => {
  assert.deepEqual(parseTerminalMouse("\u001b[<0;5;14M"), { column: 5, row: 14 });
  assert.equal(parseTerminalMouse("\u001b[<0;5;14m"), null);
  assert.equal(parseTerminalMouse("\u001b[<64;5;14M"), null);
  assert.equal(parseTerminalMouse("\u001b[<0;0;14M"), null);
  assert.equal(parseTerminalMouse("hello"), null);
});

test("typing updates only the prompt row rather than redrawing and announcing the whole terminal", () => {
  const state = createDemoState({ cells: Array(16).fill(0), score: 0, won: false, over: false });
  const options = { state, view: "game" as const, focus: "prompt" as const, command: "", feedback: "", columns: 80, rows: 20 };
  const before = buildTerminalFrame(options);
  const after = buildTerminalFrame({ ...options, command: "r" });
  assert.equal(buildTerminalUpdate(after, before), "\u001b[19;1H\u001b[2K❯ r");
});

test("closing clears old board rows, while resizing repaints the full frame", () => {
  const state = createDemoState({ cells: Array(16).fill(0), score: 0, won: false, over: false });
  const options = { state, view: "game" as const, focus: "prompt" as const, command: "", feedback: "", columns: 80, rows: 20 };
  const before = buildTerminalFrame(options);
  const closed = buildTerminalFrame({ ...options, view: "closed", feedback: "arcade closed" });
  assert.ok(buildTerminalUpdate(before).startsWith("\u001b[?1049h"));
  assert.ok(buildTerminalUpdate(closed, before).includes("\u001b[11;1H\u001b[2K"));
  assert.ok(!buildTerminalUpdate(closed, before).includes("Claude Code"));
  const resized = buildTerminalFrame({ ...options, columns: 40 });
  assert.ok(buildTerminalUpdate(resized, before).startsWith("\u001b[?7l\u001b[H\u001b[2J"));
  assert.ok(buildTerminalUpdate(resized, before).includes("Claude Code"));
});
