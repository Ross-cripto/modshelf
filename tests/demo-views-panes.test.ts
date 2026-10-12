import assert from "node:assert/strict";
import test from "node:test";
import { stripAnsi } from "../lib/demo-render.ts";
import { PANE_DEMOS, renderPanesDemo } from "../lib/demo-views/panes.ts";
import { createSimulation, submitPrompt, tickSimulation } from "../lib/mod-simulation.ts";
import type { SimulationState } from "../lib/demo-types.ts";
import type { DemoId } from "../lib/mod-demos.ts";

function fixtureState(modId: DemoId): SimulationState {
  const state = createSimulation(modId);
  return { ...state, panel: { ...state.panel, open: true, tab: "main", selection: 0 },
    usage: { input: 1000, output: 100, cached: 500, cost: 0.12, context: 24, fiveHour: 32, sevenDay: 17 } };
}

function panelText(state: SimulationState): string {
  return renderPanesDemo(state, 58).rows.map((row) => stripAnsi(row.text)).join("\n");
}

test("pane definitions retain source activation and distinct placements", () => {
  assert.equal(PANE_DEMOS.length, 8);
  assert.equal(PANE_DEMOS.find((definition) => definition.id === "image-view")?.startupCommand, "");
  assert.equal(PANE_DEMOS.find((definition) => definition.id === "image-view")?.placement, "above-prompt");
  assert.equal(PANE_DEMOS.find((definition) => definition.id === "prismantis")?.placement, "transcript");
  assert.equal(PANE_DEMOS.find((definition) => definition.id === "taskline")?.startupCommand, "/taskline demo");
  for (const definition of PANE_DEMOS) assert.match(definition.source, /\/blob\/[0-9a-f]{40}\//);
});

test("browser remains open across work and send-to-agent only fills the composer", () => {
  const state = fixtureState("terminal-browser");
  state.phase = "working";
  const panel = renderPanesDemo(state, 58);
  assert.equal(panel.graphic, "browser");
  assert.ok(panel.rows.some((row) => row.targets.some((target) => target.action.type === "fill-composer")));
  state.panel.open = false;
  assert.equal(renderPanesDemo(state, 58).rows.length, 0);
});

test("image thumbnails follow attachments rather than the working phase", () => {
  const state = fixtureState("image-view");
  assert.equal(renderPanesDemo(state, 58).graphic, "attachment");
  assert.match(panelText(state), /#1/);
  state.attachment = false;
  state.phase = "working";
  assert.deepEqual(renderPanesDemo(state, 58).rows, []);
});

test("Prismantis replaces completed reply formatting with real table and code controls", () => {
  const state = fixtureState("prismantis");
  state.phase = "complete";
  state.prompt = "Show a table and code for the change";
  const text = panelText(state);
  assert.match(text, /╞═/);
  assert.match(text, /── typescript/);
  assert.ok(renderPanesDemo(state, 58).rows.some((row) => row.targets.some((target) => target.action.type === "copy")));
  state.panel.rendered = false;
  assert.match(panelText(state), /more lines/);
});

test("Flightdeck switches main status and keeps finished receipts and agents", () => {
  const state = fixtureState("flightdeck");
  assert.match(panelText(state), /○ idle/);
  state.phase = "working";
  state.tick = 28;
  state.turn = 1;
  assert.match(panelText(state), /● working/);
  assert.match(panelText(state), /◐/);
  state.phase = "complete";
  state.tick = 60;
  assert.match(panelText(state), /receipt/);
  assert.match(panelText(state), /✓/);
});

test("Filetree responds to read and edit activity, search and hidden-file controls", () => {
  const state = fixtureState("filetree");
  state.phase = "working";
  state.tick = 34;
  assert.match(panelText(state), /app\.ts.*M/);
  assert.doesNotMatch(panelText(state), /\.gitignore/);
  state.files.hidden = true;
  assert.match(panelText(state), /\.gitignore/);
  state.files.query = "app.ts";
  assert.match(panelText(state), /app\.ts/);
  assert.doesNotMatch(panelText(state), /README\.md/);
});

test("Prompt rail uses source-correct glyph orientation and only tracks user prompts", () => {
  const state = fixtureState("prompt-rail");
  state.transcript = [
    { role: "user", text: "Fix the header", turn: 1 },
    { role: "assistant", text: "Done", turn: 1 },
    { role: "user", text: "Add tests", turn: 2 },
  ];
  state.panel.selection = 1;
  assert.match(panelText(state), /│.*┃/);
  assert.match(panelText(state), /Add tests/);
  state.panel.vertical = true;
  assert.match(panelText(state), /─/);
  assert.match(panelText(state), /━/);
  assert.doesNotMatch(panelText(state), /┃/);
});

test("PR pane expands checks and submits comments to Claude, without publishing a review", () => {
  const state = fixtureState("pull-request-pane");
  assert.match(panelText(state), /▶ checks/);
  state.panel.tab = "checks";
  state.review.comments = ["Please simplify the handler"];
  const panel = renderPanesDemo(state, 58);
  assert.match(panelText(state), /▼ checks/);
  assert.match(panelText(state), /Please simplify/);
  assert.ok(panel.rows.some((row) => row.targets.some((target) => target.action.type === "review-submit")));
  assert.match(panel.status ?? "", /Claude/);
});

test("taskline fixture advances independently of Claude and clears explicitly", () => {
  const state = fixtureState("taskline");
  state.clockTick = 65;
  assert.match(panelText(state), /Bridge.*✔/);
  assert.match(panelText(state), /Tiles.*⏸/);
  state.clockTick = 90;
  assert.match(panelText(state), /HTTP 503/);
  state.tasksCleared = true;
  assert.equal(renderPanesDemo(state, 58).rows.length, 0);
});

test("compact taskline keeps the error visible and rail click regions fit their columns", () => {
  const taskState = fixtureState("taskline");
  taskState.clockTick = 90;
  const taskPanel = renderPanesDemo(taskState, 28);
  assert.match(stripAnsi(taskPanel.rows[0].text), /HTTP 503/);
  const railState = fixtureState("prompt-rail");
  railState.transcript = [
    { role: "user", text: "First prompt", turn: 1 },
    { role: "user", text: "Second prompt", turn: 2 },
  ];
  railState.panel.vertical = true;
  const railPanel = renderPanesDemo(railState, 4);
  for (const row of railPanel.rows) {
    assert.ok(Array.from(stripAnsi(row.text)).length <= 4);
    for (const target of row.targets) assert.ok(target.column + target.width - 1 <= 4);
  }
});

test("graphics reserve their source image space and PR comments expose removal and quote targets", () => {
  const browserPanel = renderPanesDemo(fixtureState("terminal-browser"), 58);
  assert.equal(browserPanel.graphicOffset, 2);
  assert.equal(browserPanel.graphicHeight, 8);
  const imagePanel = renderPanesDemo(fixtureState("image-view"), 58);
  assert.equal(imagePanel.graphicOffset, 1);
  assert.equal(imagePanel.graphicHeight, 5);
  assert.equal(imagePanel.graphicWidth, 16);
  const reviewState = fixtureState("pull-request-pane");
  reviewState.review.comments = ["Simplify the handler"];
  const reviewPanel = renderPanesDemo(reviewState, 58);
  const actions = reviewPanel.rows.flatMap((row) => row.targets.map((target) => target.action));
  assert.ok(actions.some((action) => action.type === "review-remove" && action.index === 0));
  assert.deepEqual(actions.filter((action) => action.type === "select"), [
    { type: "select", index: 1 }, { type: "select", index: 2 },
  ]);
});

test("Prismantis wraps a long reply without losing its final words", () => {
  const state = fixtureState("prismantis");
  state.phase = "complete";
  state.turn = 1;
  state.prompt = "Improve the handler";
  const reply = "The example handler now has clear validation, named helpers, and useful empty-input checks. Every part of this longer explanation remains readable through the final end-marker.";
  state.transcript.push({ role: "assistant", text: reply, turn: 1 });
  const panel = renderPanesDemo(state, 28);
  const rows = panel.rows.map((row) => stripAnsi(row.text));
  assert.ok(rows.some((row) => row.includes("end-marker.")));
  assert.ok(rows[1].startsWith("  "));
  for (const row of rows) assert.ok(Array.from(row).length <= 28);
});

test("Prismantis streams the current turn instead of repeating the previous reply", () => {
  let state = submitPrompt(createSimulation("prismantis"), "FIRST request");
  for (let tick = 0; tick < 60; tick += 1) state = tickSimulation(state);
  state = submitPrompt(state, "SECOND request");
  for (let tick = 0; tick < 58; tick += 1) state = tickSimulation(state);
  assert.match(panelText(state), /SECOND request/);
  assert.doesNotMatch(panelText(state), /FIRST request/);
});

test("prompt rail follows the latest prompt until the visitor selects an earlier one", () => {
  const state = createSimulation("prompt-rail");
  state.transcript = [
    { role: "user", text: "First request", turn: 1 },
    { role: "user", text: "Latest request", turn: 2 },
  ];
  assert.match(panelText(state), /Latest request/);
  assert.match(renderPanesDemo(state, 58).status ?? "", /Prompt 2 of 2/);
});
