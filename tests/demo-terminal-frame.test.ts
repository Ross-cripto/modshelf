import assert from "node:assert/strict";
import test from "node:test";
import { DEMO_IDS } from "../lib/mod-demos.ts";
import { DEMO_DEFINITIONS, getDemoDefinition } from "../lib/demo-registry.ts";
import { createSimulation, submitPrompt, tickSimulation, applyDemoAction } from "../lib/mod-simulation.ts";
import { buildDemoTerminalFrame, findDemoAction, paintDemoTerminalFrame } from "../lib/demo-terminal-frame.ts";
import { stripAnsi } from "../lib/demo-render.ts";
import { WORK_TICKS } from "../lib/demo-config.ts";

test("all 24 adapters render prompt, work, completion and another turn at desktop and phone widths", () => {
  assert.equal(DEMO_DEFINITIONS.length, DEMO_IDS.length);
  for (const id of DEMO_IDS) {
    assert.match(getDemoDefinition(id).source, /github\.com\/.+\/(?:blob|tree)\/[a-f0-9]{40}(?:\/|$)/);
    let state = submitPrompt(createSimulation(id), "Show a diagram for the example garden project");
    for (let tick = 0; tick <= WORK_TICKS; tick += 1) {
      for (const width of [43, 132]) {
        const frame = buildDemoTerminalFrame(state, width, 30);
        assert.equal(frame.lines.length, 30, id);
        assert.match(stripAnsi(frame.lines[0]), /Claude Code/, id);
        for (const target of frame.targets) {
          assert.ok(target.column > 0 && target.column + target.width <= width + 1, id);
          assert.ok(target.row > 0 && target.row <= 30, id);
        }
      }
      state = tickSimulation(state);
    }
    if (state.phase === "stopped") state = submitPrompt(state, "/guard override");
    state = submitPrompt(state, "Here is a second message");
    assert.equal(state.phase, "working", id);
    assert.equal(state.turn, 2, id);
  }
});

test("frame button hit targets drive source-native tab switching and full resize painting", () => {
  let state = submitPrompt(submitPrompt(createSimulation("mission-control"), "/mission"), "Improve the handler");
  for (let tick = 0; tick < 32; tick += 1) state = tickSimulation(state);
  const frame = buildDemoTerminalFrame(state, 132, 30);
  const target = frame.targets.find(item => item.action.type === "tab" && item.action.value === "Code");
  assert.ok(target);
  assert.deepEqual(findDemoAction(frame, target.column, target.row), { type: "tab", value: "Code" });
  const changed = buildDemoTerminalFrame(applyDemoAction(state, target.action), 132, 30);
  assert.equal(changed.graphic, "files");
  assert.ok(paintDemoTerminalFrame(changed, frame).length < paintDemoTerminalFrame(changed).length);
  assert.ok(paintDemoTerminalFrame(changed).startsWith("\u001b[?1049h\u001b[?7l"));
});

test("prompt rail selection changes the transcript viewport to the selected prompt", () => {
  let state = createSimulation("prompt-rail");
  state = { ...state, transcript: [{ role: "user", text: "FIRST PROMPT", turn: 1 }, { role: "assistant", text: "First answer", turn: 1 }, { role: "user", text: "SECOND PROMPT", turn: 2 }, { role: "assistant", text: "Second answer", turn: 2 }] };
  state = applyDemoAction(state, { type: "select", index: 0 });
  const selected = buildDemoTerminalFrame(state, 132, 30);
  assert.ok(selected.lines.some(line => stripAnsi(line).includes("First answer")));
  assert.ok(!selected.lines.some(line => stripAnsi(line).includes("Second answer")));
});

test("a CJK prompt wraps without shifting docked pane columns or dropping its last characters", () => {
  const opening = createSimulation("cctop");
  const state = { ...opening, transcript: [{ role: "user" as const, text: "文".repeat(40), turn: 1 }] };
  const frame = buildDemoTerminalFrame(state, 132, 30);
  let visiblePromptCharacters = 0;
  for (const line of frame.lines.slice(3)) {
    const prefix = stripAnsi(line).split(" │ ")[0];
    let prefixCells = 0;
    for (const character of prefix) {
      prefixCells += character === "文" ? 2 : 1;
      if (character === "文") visiblePromptCharacters += 1;
    }
    assert.equal(prefixCells, 74);
  }
  assert.equal(visiblePromptCharacters, 40);
  const coachTarget = frame.targets.find(target => target.action.type === "tab" && target.action.value === "Coach");
  assert.ok(coachTarget);
  assert.equal(coachTarget.column, 85);
  assert.deepEqual(findDemoAction(frame, 85, coachTarget.row), { type: "tab", value: "Coach" });
});

test("pane-native keyboard hints survive placement into a terminal frame", () => {
  const frame = buildDemoTerminalFrame(submitPrompt(createSimulation("mission-control"), "/mission"), 132, 30);
  const codeTarget = frame.targets.find(target => target.action.type === "tab" && target.action.value === "Code");
  assert.ok(codeTarget);
  assert.equal(codeTarget.key, "c");
});

test("reduced motion holds the breathing artwork still while work status keeps updating", () => {
  const state = submitPrompt(createSimulation("mindful-claude"), "Inspect the app");
  const early = buildDemoTerminalFrame({ ...state, tick: 2, clockTick: 2 }, 80, 30, true);
  const later = buildDemoTerminalFrame({ ...state, tick: 10, clockTick: 10 }, 80, 30, true);
  const earlyPulse = early.lines.filter(line => /[░▒▓█]/u.test(stripAnsi(line)));
  const laterPulse = later.lines.filter(line => /[░▒▓█]/u.test(stripAnsi(line)));
  assert.deepEqual(earlyPulse, laterPulse);
  assert.notDeepEqual(early.lines, later.lines);
});

test("reduced motion preserves Clawd’s editing pose from the tool event", () => {
  const state = { ...submitPrompt(createSimulation("clawd-buddy"), "Edit the app"), tick: 34, clockTick: 0 };
  const ordinary = buildDemoTerminalFrame(state, 80, 30);
  const reduced = buildDemoTerminalFrame(state, 80, 30, true);
  assert.deepEqual(reduced.lines, ordinary.lines);
});
