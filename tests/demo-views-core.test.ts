import assert from "node:assert/strict";
import test from "node:test";
import { createSimulation } from "../lib/mod-simulation.ts";
import { renderCoreDemo } from "../lib/demo-views/core.ts";
import { stripAnsi } from "../lib/demo-render.ts";
import type { DemoPanel, SimulationState } from "../lib/demo-types.ts";
import type { DemoId } from "../lib/mod-demos.ts";

function fixtureState(modId: DemoId): SimulationState {
  const state = createSimulation(modId);
  return { ...state, panel: { ...state.panel, open: true, selection: 0 } };
}

function panelText(panel: DemoPanel): string {
  return stripAnsi(panel.rows.map(row => row.text).join("\n"));
}

test("arcade stays playable after Claude completes and disappears when closed", () => {
  const state = fixtureState("cc-arcade");
  state.phase = "complete";
  const panel = renderCoreDemo(state, 60);
  assert.match(panelText(panel), /● Claude is done/);
  assert.match(panelText(panel), /2048/);
  assert.ok(panel.rows.some(row => row.targets.some(target => target.action.type === "game-restart")));
  state.panel.open = false;
  assert.equal(renderCoreDemo(state, 60).rows.length, 0);
});

test("mindful breathing appears only during work and its pulse changes with time", () => {
  const state = fixtureState("mindful-claude");
  assert.equal(renderCoreDemo(state, 60).rows.length, 0);
  state.phase = "working";
  state.tick = 2;
  const firstPulse = panelText(renderCoreDemo(state, 60));
  state.tick = 10;
  const laterPulse = panelText(renderCoreDemo(state, 60));
  assert.match(laterPulse, /[░▒▓█]/);
  assert.notEqual(firstPulse, laterPulse);
  state.phase = "complete";
  assert.equal(renderCoreDemo(state, 60).rows.length, 0);
});

test("flowpane waits for Workflow and changes agent nodes from running to finished", () => {
  const state = fixtureState("flowpane");
  state.phase = "working";
  state.tick = 12;
  assert.equal(renderCoreDemo(state, 60).rows.length, 0);
  state.tick = 22;
  assert.match(panelText(renderCoreDemo(state, 60)), /researcher/);
  assert.match(panelText(renderCoreDemo(state, 60)), /running/);
  state.tick = 60;
  state.phase = "complete";
  assert.match(panelText(renderCoreDemo(state, 60)), /done/);
});

test("context lens keeps its last completed measurement while the next turn runs", () => {
  const state = fixtureState("context-lens");
  assert.match(renderCoreDemo(state, 60).status ?? "", /waiting/i);
  state.completed.push({ prompt: "Inspect the project", turn: 1, usage: { input: 1000, output: 500, cached: 200, cost: 0.01, context: 14, fiveHour: 3, sevenDay: 1 } });
  const completedMeasurement = renderCoreDemo(state, 60);
  assert.match(completedMeasurement.status ?? "", /14%/);
  state.phase = "working";
  state.usage.context = 80;
  state.tick = 45;
  assert.equal(renderCoreDemo(state, 60).status, completedMeasurement.status);
  assert.doesNotMatch(panelText(renderCoreDemo(state, 60)), /80%/);
});

test("cctop exposes its native tabs and selected Overview metric", () => {
  const state = fixtureState("cctop");
  const overview = renderCoreDemo(state, 45);
  assert.ok(overview.rows.some(row => row.targets.some(target => target.action.type === "tab" && target.action.value === "Agents")));
  assert.ok(overview.rows.some(row => row.targets.some(target => target.action.type === "select" && target.action.index === 3)));
  state.panel.selection = 3;
  assert.match(panelText(renderCoreDemo(state, 45)), /Session spend/);
  state.panel.tab = "Agents";
  state.phase = "working";
  state.tick = 26;
  assert.match(panelText(renderCoreDemo(state, 45)), /researcher/);
});

test("dino draws half block sprites and a completion banner without hiding the board", () => {
  const state = fixtureState("cc-dino");
  state.phase = "working";
  state.dino.started = true;
  state.dino.jumpTicks = 4;
  assert.match(panelText(renderCoreDemo(state, 50)), /[▀▄█]/);
  state.phase = "complete";
  assert.match(panelText(renderCoreDemo(state, 50)), /● Claude is done/);
  assert.match(panelText(renderCoreDemo(state, 50)), /╭/);
});

test("clawd is a quiet seven row mascot whose pose reacts to work", () => {
  const state = fixtureState("clawd-buddy");
  const idle = renderCoreDemo(state, 60);
  assert.equal(idle.rows.length, 7);
  assert.match(panelText(idle), /[▀▄█]/);
  assert.doesNotMatch(panelText(idle), /idle|working|clawd/i);
  state.phase = "working";
  state.tick = 34;
  assert.notEqual(panelText(renderCoreDemo(state, 60)), panelText(idle));
});

test("clawd watches the composer before a turn begins", () => {
  const state = fixtureState("clawd-buddy");
  const idle = panelText(renderCoreDemo(state, 60));
  state.composerTyping = true;
  assert.notEqual(panelText(renderCoreDemo(state, 60)), idle);
});

test("dino paints the cactus at the same column used for collision", () => {
  const state = fixtureState("cc-dino");
  state.dino.obstacle = 6;
  state.dino.jumpTicks = 4;
  const cactusRow = stripAnsi(renderCoreDemo(state, 50).rows[4].text);
  assert.equal(cactusRow[7], "Ψ");
});

test("clawd distinguishes thinking, reading, and editing during a turn", () => {
  const state = fixtureState("clawd-buddy");
  state.phase = "working";
  state.tick = 2;
  const thinking = renderCoreDemo(state, 60).rows.map(row => row.text).join("\n");
  state.tick = 14;
  const reading = renderCoreDemo(state, 60).rows.map(row => row.text).join("\n");
  state.tick = 34;
  const editing = renderCoreDemo(state, 60).rows.map(row => row.text).join("\n");
  assert.notEqual(thinking, reading);
  assert.notEqual(reading, editing);
});

test("cctop keeps native tab hit regions inside a narrow pane", () => {
  const state = fixtureState("cctop");
  const panel = renderCoreDemo(state, 35);
  for (const row of panel.rows) {
    for (const target of row.targets) assert.ok(target.column + target.width - 1 <= 35);
  }
});
