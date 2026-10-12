import assert from "node:assert/strict";
import test from "node:test";
import { actionRow, plainRow, stripAnsi, fitText, terminalCellWidth } from "../lib/demo-render.ts";

test("native text buttons expose the exact visible hit columns", () => {
  const row = actionRow([{ label: "Who", action: { type: "tab", value: "Who" } }, { label: "Close", action: { type: "close" } }]);
  assert.equal(stripAnsi(row.text), "[ Who ] [ Close ]");
  assert.deepEqual(row.targets, [
    { column: 1, width: 7, action: { type: "tab", value: "Who" } },
    { column: 9, width: 9, action: { type: "close" } },
  ]);
});

test("terminal line clipping counts visible characters instead of escape bytes", () => {
  assert.equal(stripAnsi(fitText("\u001b[33mA long title\u001b[0m", 6)), "A long");
  assert.equal(plainRow("hello").targets.length, 0);
});

test("terminal clipping uses two cells for CJK and retains a base letter’s combining mark", () => {
  assert.equal(stripAnsi(fitText("\u001b[33m文文文文文文文文\u001b[0m", 8)), "文文文文");
  assert.equal(terminalCellWidth("文文文文文文文文"), 16);
  assert.equal(terminalCellWidth("e\u0301"), 1);
  assert.equal(stripAnsi(fitText("e\u0301x", 1)), "e\u0301");
});

test("native Unicode buttons use terminal cells for their click regions", () => {
  const row = actionRow([{ label: "文", action: { type: "open" } }, { label: "Close", action: { type: "close" } }]);
  assert.deepEqual(row.targets, [
    { column: 1, width: 6, action: { type: "open" } },
    { column: 8, width: 9, action: { type: "close" } },
  ]);
});

test("native button keyboard hints are retained without adding absent hints", () => {
  const row = actionRow([{ label: "Who", key: "w", action: { type: "tab", value: "Who" } }, { label: "Close", action: { type: "close" } }]);
  assert.deepEqual(row.targets, [
    { column: 1, width: 7, action: { type: "tab", value: "Who" }, key: "w" },
    { column: 9, width: 9, action: { type: "close" } },
  ]);
});
