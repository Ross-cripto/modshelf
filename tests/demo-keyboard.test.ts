import assert from "node:assert/strict";
import test from "node:test";
import { getDemoKeyAction } from "../lib/demo-keyboard.ts";
import { createSimulation, submitPrompt } from "../lib/mod-simulation.ts";
import { buildDemoTerminalFrame } from "../lib/demo-terminal-frame.ts";
import { getDemoControls, supplementalControls } from "../lib/demo-ui.ts";
import { getDemoDefinition } from "../lib/demo-registry.ts";

test("source-declared pane and music shortcuts dispatch without interpreting composer text", () => {
  const mission = submitPrompt(createSimulation("mission-control"), "/mission");
  const frame = buildDemoTerminalFrame(mission, 132, 30);
  assert.deepEqual(getDemoKeyAction("c", mission, frame), { type: "tab", value: "Code" });
  assert.deepEqual(getDemoKeyAction("q", mission, frame), { type: "close" });
  assert.equal(getDemoKeyAction("Tab", mission, frame), null);
  const music = createSimulation("now-playing");
  assert.deepEqual(getDemoKeyAction("p", music, buildDemoTerminalFrame(music, 132, 30)), { type: "music-toggle" });
});

test("mouse hit actions have labeled keyboard-focusable supplemental equivalents", () => {
  const state = createSimulation("filetree");
  const controls = supplementalControls(state.modId, buildDemoTerminalFrame(state, 132, 30), getDemoDefinition(state.modId).controls);
  assert.ok(controls.some(button => button.label === "Select src/app.ts" && button.action.type === "select"));
});

import { createModTerminalSession } from "../lib/mod-terminal-session.ts";
import type { Terminal } from "@xterm/xterm";

test("plain Tab leaves xterm without preventing browser focus traversal", () => {
  let handler: ((event: KeyboardEvent) => boolean) | undefined;
  const terminal = {
    cols: 132, rows: 30, write() {}, attachCustomKeyEventHandler(callback: typeof handler) { handler = callback; }, attachCustomWheelEventHandler() {},
    onData() { return { dispose() {} }; }, onResize() { return { dispose() {} }; },
  } as unknown as Terminal;
  const session = createModTerminalSession(terminal, "mission-control", () => {}, () => {}, () => {});
  let prevented = false;
  const event = { type: "keydown", key: "Tab", ctrlKey: false, metaKey: false, altKey: false, preventDefault() { prevented = true; } } as KeyboardEvent;
  assert.equal(handler?.(event), false);
  assert.equal(prevented, false);
  session.dispose();
});
test("browser context selection is explicit and never immediately submits a prompt", () => {
  const state = createSimulation("terminal-browser");
  state.browserUrl = "local://about";
  const definition = getDemoDefinition(state.modId);
  const controls = getDemoControls(definition);
  const frame = buildDemoTerminalFrame(state, 132, 30);
  assert.ok(frame.targets.some(target => target.action.type === "browser-grab"));
  assert.ok(!frame.targets.some(target => target.action.type === "fill-composer"));
  assert.ok(!controls.some(button => button.action.type === "fill-composer"));
});

test("PR quotes use native text selection without mouse reporting and dispose every listener", () => {
  let selectionChanged: (() => void) | undefined;
  let selected = '';
  let selectionDisposed = false;
  const writes: string[] = [];
  const terminal = {
    cols: 132, rows: 30, write(text: string) { writes.push(text); },
    attachCustomKeyEventHandler() {}, attachCustomWheelEventHandler() {},
    onData() { return { dispose() {} }; }, onResize() { return { dispose() {} }; },
    getSelection() { return selected; },
    onSelectionChange(callback: () => void) { selectionChanged = callback; return { dispose() { selectionDisposed = true; } }; },
  } as unknown as Terminal;
  let quote = '';
  const session = createModTerminalSession(terminal, 'pull-request-pane', state => { quote = state.review.quote; }, () => {}, () => {});
  assert.ok(writes[0].includes('\u001b[?1000l\u001b[?1006l'));
  selected = 'Selected title text';
  selectionChanged?.();
  assert.equal(quote, 'Selected title text');
  session.dispose();
  assert.equal(selectionDisposed, true);
});
