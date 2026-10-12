import assert from "node:assert/strict";
import test from "node:test";
import { applyDemoAction, createSimulation, submitPrompt, tickSimulation } from "../lib/mod-simulation.ts";
import { EDIT_TICK, WORK_TICKS } from "../lib/demo-config.ts";

function advance(state: ReturnType<typeof createSimulation>, ticks: number) {
  for (let tick = 0; tick < ticks; tick += 1) state = tickSimulation(state);
  return state;
}

test("native defaults keep Mission closed, show hidden files and sample subscription quota at startup", () => {
  assert.equal(createSimulation("mission-control").panel.open, false);
  assert.equal(createSimulation("filetree").files.hidden, true);
  assert.equal(createSimulation("quota-meter").usage.fiveHour, 42);
  assert.equal(createSimulation("budget-guard").budget.dollars, 0);
  assert.equal(createSimulation("prompt-rail").panel.vertical, false);
});

test("Mermaid ASCII and direction settings remain independent from diagram rendering", () => {
  let state = createSimulation("mermaid-draw");
  state = submitPrompt(state, "/mermaid ascii on");
  assert.equal(state.panel.ascii, true);
  assert.equal(state.panel.rendered, true);
  state = submitPrompt(state, "/mermaid ascii off");
  assert.equal(state.panel.ascii, false);
  assert.equal(state.panel.rendered, true);
  state = submitPrompt(state, "/mermaid lr off");
  assert.equal(state.panel.vertical, true);
  state = submitPrompt(state, "/mermaid reset");
  assert.equal(state.panel.vertical, false);
  assert.equal(state.panel.tab, "Color");
});

test("budget guard applies native subscription limits before a new prompt", () => {
  const initial = createSimulation("budget-guard");
  const full = { ...initial, usage: { ...initial.usage, fiveHour: 90 } };
  assert.equal(submitPrompt(full, "Help me").decision, "budget");
  const raised = submitPrompt(full, "/guard 5h 95");
  assert.equal(submitPrompt(raised, "Help me").phase, "working");
});

test("Markdown only opens files actually edited by completed tool events", () => {
  let state = submitPrompt(createSimulation("md-preview"), "/md");
  assert.equal(state.panel.open, false);
  state = advance(submitPrompt(state, "Update docs"), EDIT_TICK);
  assert.deepEqual(state.markdownFiles, ["README.md"]);
  state = submitPrompt(state, "/md README.md");
  assert.equal(state.panel.open, true);
  state = advance(state, WORK_TICKS - EDIT_TICK);
  state = advance(submitPrompt(state, "Update contribution docs"), EDIT_TICK);
  assert.deepEqual(state.markdownFiles, ["README.md", "CONTRIBUTING.md"]);
});

test("Dino reset clears the stored best while preserving the current run and pane", () => {
  const initial = createSimulation("cc-dino");
  const running = { ...initial, panel: { ...initial.panel, open: false }, dino: { ...initial.dino, started: true, score: 50, best: 80 } };
  const reset = submitPrompt(running, "/dino reset");
  assert.equal(reset.dino.best, 0);
  assert.equal(reset.dino.score, 50);
  assert.equal(reset.panel.open, false);
});

test("taskline selects native layouts and records clear events separately from hiding the pane", () => {
  let state = submitPrompt(createSimulation("taskline"), "/taskline layout stacked");
  assert.equal(state.panel.tab, "stacked");
  state = tickSimulation(state);
  const cleared = submitPrompt(state, "/taskline clear");
  assert.equal(cleared.taskClearTick, state.clockTick);
  assert.equal(cleared.taskClearAll, false);
  assert.equal(submitPrompt(state, "/taskline clear all").taskClearAll, true);
  assert.equal(submitPrompt(state, "/taskline hide").panel.open, false);
});

test("queue movement and steering cancellation keep source order", () => {
  let state = createSimulation("prompt-queue");
  state = submitPrompt(state, "/q First");
  state = submitPrompt(state, "/q Second");
  state = submitPrompt(state, "/q Third");
  state = submitPrompt(state, "/q mv 1 3");
  assert.deepEqual(state.queue, ["Second", "Third", "First"]);
  state = submitPrompt(state, "Main task");
  state = applyDemoAction(state, { type: "queue-now", index: 0 });
  assert.deepEqual(state.steering, ["Second"]);
  state = applyDemoAction(state, { type: "queue-unsteer", index: 0 });
  assert.deepEqual(state.steering, []);
  assert.deepEqual(state.queue, ["Third", "First"]);
});

test("breathing presets, styles and delayed spinner changes follow native commands", () => {
  let state = createSimulation("mindful-claude");
  state = submitPrompt(state, "/breathe box");
  state = submitPrompt(state, "/breathe style dots");
  assert.equal(state.panel.tab, "box:dots");
  state = submitPrompt(state, "/breathe delay 4");
  assert.equal(state.mindful.delaySeconds, 4);
  state = submitPrompt(state, "/breathe spinner off");
  assert.equal(state.mindful.spinner, false);
  const same = submitPrompt(state, "/breathe");
  assert.deepEqual(same.panel, state.panel);
});

test("Flightdeck reset clears dashboard history while retaining the Claude conversation and account usage", () => {
  let state = advance(submitPrompt(createSimulation("flightdeck"), "Review the app"), WORK_TICKS);
  state = submitPrompt(state, "/flightdeck layout mini");
  assert.equal(state.panel.tab, "mini");
  const reset = submitPrompt(state, "/flightdeck reset");
  assert.equal(reset.flightdeckResetTurn, state.turn);
  assert.equal(reset.flightdeckResetEntry, state.nextEntryId);
  assert.deepEqual(reset.transcript, state.transcript);
  assert.deepEqual(reset.usage, state.usage);
});

test("file navigation and git edits persist independently of each new turn", () => {
  let state = advance(submitPrompt(createSimulation("filetree"), "Update the app"), WORK_TICKS);
  state = submitPrompt(state, "Check it again");
  assert.equal(state.files.modified, true);
  state = applyDemoAction(state, { type: "file-up" });
  assert.equal(state.files.atParent, true);
  state = applyDemoAction(state, { type: "file-cwd" });
  assert.equal(state.files.atParent, false);
});

test("explicit Markdown paths open existing files before an edit without inventing changed content", () => {
  const state = submitPrompt(createSimulation("md-preview"), "/md README.md");
  assert.equal(state.panel.open, true);
  assert.deepEqual(state.markdownFiles, ["README.md"]);
  assert.deepEqual(state.markdownEditedFiles, []);
  const pair = submitPrompt(state, "/md compare README.md CONTRIBUTING.md");
  assert.deepEqual(pair.markdownPair, ["README.md", "CONTRIBUTING.md"]);
  assert.deepEqual(pair.markdownEditedFiles, []);
});

test("ledger records separate subagent and main completions with priced cost deltas", () => {
  const state = advance(submitPrompt(createSimulation("token-ledger"), "Inspect and improve the project"), WORK_TICKS);
  assert.equal(state.completed.length, 2);
  assert.equal(state.completed[0].subagent, true);
  assert.equal(state.completed[0].costDelta, 0.008);
  assert.equal(state.completed[1].subagent, false);
  assert.equal(state.completed[1].costDelta, 0.020);
  assert.equal(state.usage.cost, 0.028);
});

test("Context Lens keeps exact host tokens separate from rounded percentages and resets after compaction", () => {
  let state = advance(submitPrompt(createSimulation("context-lens"), "Review the code"), WORK_TICKS);
  assert.equal(state.contextLens?.tokens, 45900);
  assert.equal(state.completed[0].contextTokens, 45900);
  assert.equal(state.usage.context, 5);
  state = advance(submitPrompt(state, "Review another file"), WORK_TICKS);
  assert.equal(state.completed[1].contextTokens, 53900);
  state = applyDemoAction(state, { type: "compact" });
  assert.equal(state.contextLens, undefined);
  assert.equal(state.completed.length, 0);
});

test("browser history moves between local pages and discards forward history on new navigation", () => {
  let state = applyDemoAction(createSimulation("terminal-browser"), { type: "browser-go", url: "local://about" });
  state = applyDemoAction(state, { type: "browser-back" });
  assert.equal(state.browserUrl, "local://example");
  state = applyDemoAction(state, { type: "browser-forward" });
  assert.equal(state.browserUrl, "local://about");
  state = applyDemoAction(state, { type: "browser-back" });
  state = applyDemoAction(state, { type: "browser-go", url: "local://about" });
  assert.equal(state.browserHistory.length, 2);
});

test("Filetree command resets its native root and Taskline records remove and check events", () => {
  let files = submitPrompt(createSimulation("filetree"), "/filetree ..");
  assert.equal(files.files.atParent, true);
  files = submitPrompt(files, "/filetree");
  assert.equal(files.files.atParent, false);
  let tasks = submitPrompt(createSimulation("taskline"), "/taskline hide");
  tasks = submitPrompt(tasks, "/taskline");
  assert.equal(tasks.panel.open, false);
  tasks = submitPrompt(tasks, "/taskline rm demo-download");
  assert.deepEqual(tasks.taskRemoved, [{ id: "demo-download", tick: 0 }]);
  tasks = submitPrompt(tasks, "/taskline check");
  assert.deepEqual(tasks.taskCheckTicks, [0]);
  tasks = submitPrompt(tasks, "/taskline demo");
  assert.deepEqual(tasks.taskRemoved, []);
  assert.deepEqual(tasks.taskCheckTicks, []);
});

test("a stopped Flowpane run remains stopped when another main prompt begins", async () => {
  const { renderCoreDemo } = await import('../lib/demo-views/core.ts');
  const { stripAnsi } = await import('../lib/demo-render.ts');
  let state = advance(submitPrompt(createSimulation('flowpane'), 'Inspect the workflow'), 24);
  state = applyDemoAction(state, { type: 'stop' });
  state = submitPrompt(state, 'Start a second task');
  const text = renderCoreDemo(state, 120).rows.map(row => stripAnsi(row.text)).join('\n');
  assert.match(text, /⊘ researcher/);
  assert.doesNotMatch(text, /✔ implementer/);
});

test("Taskline rate follows the native smoothed producer speed", async () => {
  const { renderPanesDemo } = await import('../lib/demo-views/panes.ts');
  const { stripAnsi } = await import('../lib/demo-render.ts');
  const state = createSimulation('taskline');
  state.panel.tab = 'stacked';
  state.clockTick = 30;
  const text = renderPanesDemo(state, 150).rows.map(row => stripAnsi(row.text)).join('\n');
  assert.match(text, /132\.2 MB\/s.*ETA 0:12/);
});

test("selecting an earlier prompt rail turn retains its tools and completed answer", async () => {
  const { buildDemoTerminalFrame } = await import('../lib/demo-terminal-frame.ts');
  const { stripAnsi } = await import('../lib/demo-render.ts');
  let state = advance(submitPrompt(createSimulation('prompt-rail'), 'Review the first handler'), WORK_TICKS);
  state = advance(submitPrompt(state, 'Review the second handler'), WORK_TICKS);
  state = applyDemoAction(state, { type: 'select', index: 0 });
  const text = buildDemoTerminalFrame(state, 132, 60).lines.map(stripAnsi).join('\n');
  assert.match(text, /Finished “Review the first handler”/);
  assert.match(text, /npm test/);
  assert.doesNotMatch(text, /Finished “Review the second handler”/);
});

test("completed Mermaid fences remain rendered during a later unrelated prompt", async () => {
  const { buildDemoTerminalFrame } = await import('../lib/demo-terminal-frame.ts');
  const { stripAnsi } = await import('../lib/demo-render.ts');
  let state = advance(submitPrompt(createSimulation('mermaid-draw'), 'Draw a diagram'), WORK_TICKS);
  state = submitPrompt(state, 'Review another file');
  const text = buildDemoTerminalFrame(state, 132, 60).lines.map(stripAnsi).join('\n');
  assert.match(text, /┌─────────┐/);
  assert.doesNotMatch(text, /```mermaid/);
});

test("Mermaid graphs with extra edges retain their complete source", async () => {
  const { renderMermaidTranscriptEntry } = await import('../lib/demo-views/hooks.ts');
  const { stripAnsi } = await import('../lib/demo-render.ts');
  const graph = '```mermaid\ngraph TD\n  Request --> Plan --> Result\n  Result --> Extra\n```';
  const text = renderMermaidTranscriptEntry(graph, createSimulation('mermaid-draw'), 132).map(row => stripAnsi(row.text)).join('\n');
  assert.match(text, /```mermaid/);
  assert.match(text, /Result --> Extra/);
  assert.doesNotMatch(text, /┌─────────┐/);
});
