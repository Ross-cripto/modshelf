import assert from "node:assert/strict";
import test from "node:test";
import { stripAnsi } from "../lib/demo-render.ts";
import { PANE_DEMOS, renderPanesDemo, renderPrismantisTranscriptEntry } from "../lib/demo-views/panes.ts";
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

test("browser remains open across work and exposes the native grab selection control", () => {
  const state = fixtureState("terminal-browser");
  state.phase = "working";
  const panel = renderPanesDemo(state, 58);
  assert.equal(panel.graphic, "browser");
  assert.ok(panel.rows.some((row) => row.targets.some((target) => target.action.type === "browser-grab")));
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
  state.transcript = [{ role: "assistant", turn: 0, text: "| Change | Result |\n| --- | --- |\n| Handler | Simplified |\n| Checks | Passing |\n\n```typescript\nexport function summarize(input: string) {\n  return input.trim();\n}\n```" }];
  const text = panelText(state);
  assert.match(text, /╞═/);
  assert.match(text, /── typescript/);
  assert.ok(renderPanesDemo(state, 58).rows.some((row) => row.targets.some((target) => target.action.type === "copy")));
  state.panel.rendered = false;
  assert.doesNotMatch(panelText(state), /more lines/);
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
  assert.match(panelText(state), /last turn/);
  assert.match(panelText(state), /✓/);
});

test("Filetree responds to read and edit activity, search and hidden-file controls", () => {
  const state = fixtureState("filetree");
  state.phase = "working";
  state.tick = 34;
  assert.match(panelText(state), /app\.ts.*M/);
  assert.match(panelText(state), /\.gitignore/);
  state.files.hidden = false;
  assert.doesNotMatch(panelText(state), /\.gitignore/);
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
  assert.equal(imagePanel.graphicHeight, 6);
  assert.equal(imagePanel.graphicWidth, 19);
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

test("Taskline recreates source counts, clock formatting and removes finished jobs after their last update", () => {
  const state = fixtureState("taskline");
  state.panel.tab = "stacked";
  state.clockTick = 60;
  assert.match(panelText(state), /⬇ Bridge ✔ 1,000\/1,000 files in 0:24/);
  const taskRows = renderPanesDemo(state, 58).rows.map(row => stripAnsi(row.text)).filter(row => !row.includes("CHECK!!")).join("\n");
  assert.ok(taskRows.indexOf("Index") < taskRows.indexOf("Bridge"));
  state.clockTick = 85;
  assert.match(panelText(state), /Tiles ✖ HTTP 503/);
  assert.doesNotMatch(panelText(state), /Tiles.*412\/3,400/);
  assert.match(panelText(state), /Index ✔ in 0:34/);
  state.clockTick = 109;
  assert.match(panelText(state), /Bridge/);
  state.clockTick = 110;
  assert.doesNotMatch(panelText(state), /Bridge|Index/);
});

test("Taskline fits source single mode by reducing detail before folding other tasks", () => {
  const state = fixtureState("taskline");
  state.panel.tab = "single";
  state.clockTick = 50;
  const panel = renderPanesDemo(state, 40);
  assert.equal(panel.rows.length, 1);
  assert.match(stripAnsi(panel.rows[0].text), /Tiles.*\+2 more/);
});

test("Filetree activity colors expire instead of permanently painting every read file", () => {
  const state = fixtureState("filetree");
  state.phase = "working";
  state.tick = 12;
  const readRows = renderPanesDemo(state, 58).rows.find(row => stripAnsi(row.text).includes("app.ts"));
  assert.match(readRows?.text ?? "", /38;2;192;132;252/);
  state.tick = 60;
  const completedRows = renderPanesDemo(state, 58).rows.find(row => stripAnsi(row.text).includes("app.ts"));
  assert.doesNotMatch(completedRows?.text ?? "", /38;2;192;132;252|38;2;249;115;22/);
  assert.match(completedRows?.text ?? "", /\+8.*-2.*M/);
});

test("Prismantis formats reply content instead of inventing blocks from words in the prompt", () => {
  const state = fixtureState("prismantis");
  state.phase = "complete";
  state.prompt = "Explain table creation";
  state.transcript = [{ role: "assistant", turn: 0, text: "A table stores rows." }];
  assert.doesNotMatch(panelText(state), /╞═|── typescript/);
  assert.doesNotMatch(panelText(state), /copy reply/);
});

test("Prismantis folds only source-sized long code and puts copy beside the code header", () => {
  const state = fixtureState("prismantis");
  state.phase = "complete";
  state.panel.rendered = false;
  const codeLines = Array.from({ length: 32 }, (_, index) => `const item${index + 1} = ${index + 1};`);
  state.transcript = [{ role: "assistant", turn: 0, text: "```typescript\n" + codeLines.join("\n") + "\n```" }];
  const panel = renderPanesDemo(state, 58);
  const header = panel.rows.find(row => stripAnsi(row.text).includes("── typescript"));
  assert.ok(header?.targets.some(target => target.action.type === "copy"));
  assert.match(panelText(state), /\+12 more lines/);
  assert.doesNotMatch(panelText(state), /item21/);
  state.panel.rendered = true;
  assert.match(panelText(state), /item32/);
});

test("Prompt rail uses adjacent bars and a numbered two-row horizontal band", () => {
  const state = fixtureState("prompt-rail");
  state.panel.selection = -1;
  state.panel.vertical = false;
  state.transcript = [{ role: "user", text: "First", turn: 1 }, { role: "user", text: "Second", turn: 2 }];
  const rows = renderPanesDemo(state, 58).rows.map(row => stripAnsi(row.text));
  assert.equal(rows.length, 2);
  assert.match(rows[0], /^  #2 Second/);
  assert.equal(rows[1], "  │┃");
  state.panel.vertical = true;
  assert.doesNotMatch(panelText(state), /Prompts/);
});

test("PR refresh is actionable and Submit remains visible before comments exist", () => {
  const state = fixtureState("pull-request-pane");
  const panel = renderPanesDemo(state, 58);
  assert.ok(panel.rows[0].targets.some(target => target.action.type === "file-refresh"));
  assert.match(panelText(state), /Submit.*0 comments/);
  assert.match(panelText(state), /overall/);
  assert.doesNotMatch(panelText(state), /Comments for Claude|Write a comment in the field below/);
});

test("Flightdeck uses native gauges, effort label and session log panel", () => {
  const state = fixtureState("flightdeck");
  assert.match(panelText(state), /▰▰▱/);
  assert.match(panelText(state), /▮▮▮▯ high/);
  assert.match(panelText(state), /session log/);
  assert.doesNotMatch(panelText(state), /cost \$/);
});

test("Taskline clearing removes written files until each demo producer updates them again", () => {
  const state = fixtureState("taskline");
  state.clockTick = 50;
  state.taskClearTick = 50;
  state.taskClearAll = true;
  state.tasksCleared = true;
  assert.match(panelText(state), /Bridge|Index/);
  assert.doesNotMatch(panelText(state), /Tiles/);
  state.clockTick = 52;
  assert.match(panelText(state), /Bridge|Index/);
  assert.doesNotMatch(panelText(state), /Tiles/);
  state.clockTick = 85;
  assert.match(panelText(state), /Tiles.*HTTP 503/);
});

test("Flightdeck mini layout uses its native inline summary rather than full boxes", () => {
  const state = fixtureState("flightdeck");
  state.panel.tab = "mini";
  const text = panelText(state);
  assert.match(text, /Sonnet.*○ idle.*ctx/);
  assert.doesNotMatch(text, /╭|session log/);
});

test("Prismantis prompt bubbles size to the user text and use the native theme heading color", () => {
  const state = fixtureState("prismantis");
  const rows = renderPrismantisTranscriptEntry({ role: "user", turn: 1, text: "Hello" }, state, 58);
  assert.equal(stripAnsi(rows[0].text), "╭───────╮");
  assert.match(rows[1].text, /38;2;249;226;175/);
});

test("Taskline uses the native short completion celebration while the band has no raster room", () => {
  const state = fixtureState("taskline");
  state.clockTick = 60;
  assert.match(stripAnsi(renderPanesDemo(state, 58).rows[0].text), /✔ CHECK!!.*Bridge/);
  state.clockTick = 67;
  assert.doesNotMatch(panelText(state), /CHECK!!/);
});

test("Prismantis tool chat aligns its completion dot after the dim tool label", () => {
  const state = fixtureState("prismantis");
  const rows = renderPrismantisTranscriptEntry({ role: "tool", turn: 1, text: "◉ Read src/app.ts · 146 lines" }, state, 58);
  assert.match(stripAnsi(rows[0].text), /^\s+Read src\/app\.ts.*●$/);
});

test("Browser chrome exposes navigation only when history exists and grab selects content", () => {
  const state = fixtureState("terminal-browser");
  assert.match(panelText(state), /↻.*local:\/\/example.*▧/);
  assert.doesNotMatch(panelText(state), /Send to agent|browser ·/);
  state.browserHistory = ["local://example", "local://about"];
  state.browserHistoryIndex = 1;
  state.browserUrl = "local://about";
  const panel = renderPanesDemo(state, 58);
  const actions = panel.rows.flatMap(row => row.targets.map(target => target.action));
  assert.ok(actions.some(action => action.type === "browser-back"));
  assert.ok(actions.some(action => action.type === "browser-reload"));
  assert.ok(actions.some(action => action.type === "browser-grab"));
  assert.ok(!actions.some(action => action.type === "fill-composer"));
  assert.ok(!actions.some(action => action.type === "browser-forward"));
  state.browserHistoryIndex = 0;
  const previousActions = renderPanesDemo(state, 58).rows.flatMap(row => row.targets.map(target => target.action));
  assert.ok(previousActions.some(action => action.type === "browser-forward"));
  state.browserMenu = true;
  assert.match(panelText(state), /Record\nInspect\nSettings/);
  assert.doesNotMatch(panelText(state), /Send to agent/);
  state.browserGrab = true;
  assert.match(renderPanesDemo(state, 58).rows[0].text, /38;2;179;69;160/);
});

test("Taskline rm uses source file IDs and allows only the removed producer to recreate its job", () => {
  const state = fixtureState("taskline");
  state.panel.tab = "stacked";
  state.clockTick = 50;
  state.taskRemoved = [{ id: "demo-download", tick: 50 }, { id: "demo-stuck", tick: 50 }];
  assert.doesNotMatch(panelText(state), /Bridge|Tiles/);
  assert.match(panelText(state), /Index/);
  state.clockTick = 52;
  assert.match(panelText(state), /Bridge/);
  assert.doesNotMatch(panelText(state), /Tiles/);
  state.clockTick = 85;
  assert.match(panelText(state), /Tiles/);
  state.taskRemoved = [{ id: "demo-download", tick: 85 }];
  assert.doesNotMatch(panelText(state), /Bridge/);
  state.clockTick = 86;
  assert.doesNotMatch(panelText(state), /Bridge/);
});

test("Taskline explicit check uses the native label for 2.8 seconds even without visible tasks", () => {
  const state = fixtureState("taskline");
  state.clockTick = 120;
  state.taskRemoved = [{ id: "demo-stuck", tick: 120 }];
  state.taskCheckTicks = [120];
  assert.match(panelText(state), /✔ CHECK!!.*taskline/);
  state.clockTick = 126;
  assert.match(panelText(state), /CHECK!!/);
  state.clockTick = 127;
  assert.equal(renderPanesDemo(state, 58).rows.length, 0);
});

test("Taskline queues three waiting checks and ignores further check requests until space is free", () => {
  const state = fixtureState("taskline");
  state.taskCheckTicks = [0, 1, 2, 3, 4];
  state.clockTick = 21;
  assert.match(panelText(state), /CHECK!!.*taskline/);
  state.clockTick = 28;
  assert.doesNotMatch(panelText(state), /CHECK!!/);
});
