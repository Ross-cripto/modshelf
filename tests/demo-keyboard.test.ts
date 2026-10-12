import assert from "node:assert/strict";
import test from "node:test";
import { getDemoKeyAction } from "../lib/demo-keyboard.ts";
import { createSimulation } from "../lib/mod-simulation.ts";
import { buildDemoTerminalFrame } from "../lib/demo-terminal-frame.ts";
import { getDemoControls, supplementalControls } from "../lib/demo-ui.ts";
import { getDemoDefinition } from "../lib/demo-registry.ts";

test("source-declared pane and music shortcuts dispatch without interpreting composer text", () => {
  const mission = createSimulation("mission-control");
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
test("both browser context controls include the currently selected page", () => {
  const state = createSimulation("terminal-browser");
  state.browserUrl = "local://about";
  const definition = getDemoDefinition(state.modId);
  const controls = getDemoControls(definition, state);
  const frame = buildDemoTerminalFrame(state, 132, 30);
  const external = controls.find(button => button.action.type === "fill-composer")?.action;
  const native = frame.targets.find(target => target.action.type === "fill-composer")?.action;
  assert.deepEqual(external, native);
  assert.ok(external?.type === "fill-composer" && external.text.includes("local://about"));
});
