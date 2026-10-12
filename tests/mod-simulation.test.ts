import assert from "node:assert/strict";
import test from "node:test";
import { createSimulation, submitPrompt, tickSimulation, applyDemoAction, sanitizePrompt } from "../lib/mod-simulation.ts";
import { WORK_TICKS, CHECK_TICK } from "../lib/demo-config.ts";
import { getHeldCommandFixture } from "../lib/demo-fixtures.ts";
import { renderHooksDemo } from "../lib/demo-views/hooks.ts";
import { stripAnsi } from "../lib/demo-render.ts";

function finish(state: ReturnType<typeof createSimulation>) {
  for (let tick = 0; tick < WORK_TICKS; tick += 1) state = tickSimulation(state);
  return state;
}

test("arbitrary input produces one local turn with a final reply and completion usage", () => {
  const working = submitPrompt(createSimulation("context-lens"), "Please help me with my garden");
  assert.equal(working.phase, "working");
  assert.equal(working.usage.input, 0);
  const completed = finish(working);
  assert.equal(completed.phase, "complete");
  assert.equal(completed.completed.length, 1);
  assert.match(completed.transcript.at(-1)?.text ?? "", /garden/);
  assert.ok(completed.usage.input > 0);
  assert.equal(submitPrompt(completed, "One more thing").turn, 2);
});

test("busy input is not silently queued; explicit /q queues then drains after completion", () => {
  let state = submitPrompt(createSimulation("prompt-queue"), "Build a page");
  state = submitPrompt(state, "Ordinary message");
  assert.equal(state.queue.length, 0);
  state = submitPrompt(state, "/q Then add tests");
  assert.deepEqual(state.queue, ["Then add tests"]);
  state = finish(state);
  assert.equal(state.phase, "complete");
  for (let tick = 0; tick < 13; tick += 1) state = tickSimulation(state);
  assert.equal(state.phase, "working");
  assert.equal(state.prompt, "Then add tests");
});

test("queue steering is delivered in tool context, not as another user prompt", () => {
  let state = submitPrompt(createSimulation("prompt-queue"), "Build a page");
  state = submitPrompt(state, "/q Use blue buttons");
  state = applyDemoAction(state, { type: "queue-now", index: 0 });
  for (let tick = 0; tick < 12; tick += 1) state = tickSimulation(state);
  assert.equal(state.turn, 1);
  assert.equal(state.transcript.filter(entry => entry.role === "user").length, 1);
  assert.ok(state.injected.includes("Use blue buttons"));
});

test("blast-radius holds risky tool before execution, allowing cancellation", () => {
  let state = submitPrompt(createSimulation("blast-radius"), "Delete the old build directory");
  for (let tick = 0; tick < CHECK_TICK; tick += 1) state = tickSimulation(state);
  assert.equal(state.decision, "command");
  assert.equal(state.phase, "decision");
  assert.ok(!state.transcript.some(entry => entry.text.includes("Removed 12")));
  state = applyDemoAction(state, { type: "deny" });
  assert.equal(state.phase, "working");
  assert.match(state.transcript.at(-1)?.text ?? "", /denied/i);
});

test("budget prompt override lasts one main turn; commands still pass through", () => {
  let state = createSimulation("budget-guard");
  state = { ...state, usage: { ...state.usage, cost: 2 } };
  state = submitPrompt(state, "/guard cost 1");
  state = submitPrompt(state, "Continue anyway");
  assert.equal(state.decision, "budget");
  state = applyDemoAction(state, { type: "override" });
  assert.equal(state.phase, "working");
  state = finish(state);
  assert.equal(state.budget.overridden, false);
  assert.equal(submitPrompt(state, "Another prompt").decision, "budget");
});

test("attachment clears on send and terminal escape input is removed", () => {
  let state = applyDemoAction(createSimulation("image-view"), { type: "attach" });
  assert.equal(state.attachment, true);
  state = submitPrompt(state, "Describe this\u001b[31m image\u0007");
  assert.equal(state.attachment, false);
  assert.equal(sanitizePrompt("hello\u001b]0;evil\u0007\r\nworld"), "hello world");
  assert.match(state.transcript.at(-1)?.text ?? "", /Image #1/);
});

test("clock-based mods continue while idle and stopped work cannot complete", () => {
  let state = createSimulation("now-playing");
  const before = state.playback.position;
  state = tickSimulation(state);
  assert.ok(state.playback.position > before);
  state = submitPrompt(state, "Anything");
  state = applyDemoAction(state, { type: "stop" });
  state = finish(state);
  assert.equal(state.phase, "stopped");
  assert.equal(state.completed.length, 0);
});

test("a prompt explicitly queued while idle starts on the next clock tick", () => {
  let state = submitPrompt(createSimulation("prompt-queue"), "/q Add a focused test");
  state = tickSimulation(state);
  assert.equal(state.phase, "working");
  assert.equal(state.prompt, "Add a focused test");
  assert.deepEqual(state.queue, []);
});

test("Stop returns undelivered steering to the front and continues draining requested tasks", () => {
  let state = submitPrompt(createSimulation("prompt-queue"), "Build a page");
  state = submitPrompt(state, "/q Use blue buttons");
  state = submitPrompt(state, "/q Add tests");
  state = applyDemoAction(state, { type: "queue-now", index: 0 });
  state = applyDemoAction(state, { type: "stop" });
  assert.deepEqual(state.queue, ["Use blue buttons", "Add tests"]);
  assert.deepEqual(state.steering, []);
  state = tickSimulation(state);
  assert.equal(state.phase, "working");
  assert.equal(state.prompt, "Use blue buttons");
  assert.equal(state.turn, 2);
});

test("a queued slash command preserves the minimum gap before dispatching the following prompt", () => {
  let state = submitPrompt(createSimulation("prompt-queue"), "/q /q status");
  state = submitPrompt(state, "/q Explain the app");
  state = tickSimulation(state);
  assert.deepEqual(state.queue, ["Explain the app"]);
  for (let tick = 0; tick < 12; tick += 1) state = tickSimulation(state);
  assert.equal(state.turn, 0);
  state = tickSimulation(state);
  assert.equal(state.turn, 1);
  assert.equal(state.prompt, "Explain the app");
});

test("/q send during work leaves the queue intact rather than steering the current turn", () => {
  let state = submitPrompt(createSimulation("prompt-queue"), "Build a page");
  state = submitPrompt(state, "/q Add tests");
  state = submitPrompt(state, "/q send");
  assert.deepEqual(state.queue, ["Add tests"]);
  assert.deepEqual(state.steering, []);
  assert.equal(state.prompt, "Build a page");
});

test("delivered steering belongs to its original turn rather than leaking into the next reply", () => {
  let state = submitPrompt(createSimulation("prompt-queue"), "Build a page");
  state = submitPrompt(state, "/q Use blue buttons");
  state = applyDemoAction(state, { type: "queue-now", index: 0 });
  state = finish(state);
  assert.match(state.transcript.at(-1)?.text ?? "", /Use blue buttons/);
  state = finish(submitPrompt(state, "Explain the test setup"));
  assert.doesNotMatch(state.transcript.at(-1)?.text ?? "", /Use blue buttons/);
});

test("Jump restarts a crashed dinosaur before applying the jump", () => {
  let state = createSimulation("cc-dino");
  state = { ...state, dino: { ...state.dino, started: true, over: true, score: 42, obstacle: 6 } };
  state = applyDemoAction(state, { type: "dino-jump" });
  assert.equal(state.dino.over, false);
  assert.equal(state.dino.score, 0);
  assert.equal(state.dino.obstacle, 24);
  assert.ok(state.dino.jumpTicks > 0);
  const next = tickSimulation(state);
  assert.ok(next.dino.score > 0);
});

test("dinosaur collision starts when the cactus reaches its visible body", () => {
  let state = createSimulation("cc-dino");
  state = { ...state, dino: { ...state.dino, started: true, obstacle: 10 } };
  state = tickSimulation(state);
  assert.equal(state.dino.over, false);
  state = tickSimulation(state);
  assert.equal(state.dino.obstacle, 8);
  assert.equal(state.dino.over, true);
});

test("a timely dinosaur jump clears its entire visible collision width", () => {
  let state = createSimulation("cc-dino");
  state = { ...state, dino: { ...state.dino, started: true, obstacle: 9 } };
  state = applyDemoAction(state, { type: "dino-jump" });
  for (let tick = 0; tick < 6; tick += 1) state = tickSimulation(state);
  assert.equal(state.dino.obstacle, 3);
  assert.equal(state.dino.over, false);
});

test("database removal uses the same migration fixture in the gate, pane and execution transcript", () => {
  const fixture = getHeldCommandFixture("Remove the database schema");
  assert.equal(fixture?.command, "npm run db:migrate");
  assert.ok(fixture?.details.some(detail => /cannot.*preview/i.test(detail)));
  let state = submitPrompt(createSimulation("blast-radius"), "Remove the database schema");
  for (let tick = 0; tick < CHECK_TICK; tick += 1) state = tickSimulation(state);
  assert.equal(state.decision, "command");
  const pane = stripAnsi(renderHooksDemo(state, 80).rows.map(row => row.text).join("\n"));
  assert.match(pane, /npm run db:migrate/);
  assert.doesNotMatch(pane, /240.*rows|1 table/);
  state = applyDemoAction(state, { type: "proceed" });
  assert.match(state.transcript.at(-1)?.text ?? "", /npm run db:migrate/);
  assert.doesNotMatch(state.transcript.at(-1)?.text ?? "", /rm -rf/);
});

test("file selection is captured in the submitted turn even if the visitor selects another file", () => {
  let state = applyDemoAction(createSimulation("filetree"), { type: "select", index: 2 });
  state = submitPrompt(state, "Explain this file");
  assert.match(state.transcript.at(-1)?.text ?? "", /src\/styles.css/);
  state = applyDemoAction(state, { type: "select", index: 4 });
  state = finish(state);
  const reply = state.transcript.at(-1)?.text ?? "";
  assert.match(reply, /src\/styles.css/);
  assert.doesNotMatch(reply, /README.md/);
  state = submitPrompt(state, "And explain the next file");
  assert.match(state.transcript.at(-1)?.text ?? "", /README.md/);
});

test("cctop and Flightdeck accrue live usage while each completed turn charges its fixture once", () => {
  for (const modId of ["cctop", "flightdeck"] as const) {
    let state = createSimulation(modId);
    state = { ...state, usage: { ...state.usage, cost: 0.1, context: 16 } };
    state = submitPrompt(state, "Check this project");
    for (let tick = 0; tick < 12; tick += 1) state = tickSimulation(state);
    assert.ok(state.usage.cost > 0.1);
    assert.ok(state.usage.context > 16);
    assert.ok(state.usage.input > 0);
    for (let tick = 12; tick < WORK_TICKS; tick += 1) state = tickSimulation(state);
    assert.equal(state.usage.cost, 0.128);
    assert.equal(state.usage.context, 24);
    state = finish(submitPrompt(state, "Check one more thing"));
    assert.equal(state.usage.cost, 0.156);
    assert.equal(state.usage.context, 32);
  }
});

test("completed-only meters do not expose live turn usage", () => {
  for (const modId of ["context-lens", "quota-meter", "token-ledger"] as const) {
    let state = submitPrompt(createSimulation(modId), "Check this project");
    for (let tick = 0; tick < 32; tick += 1) state = tickSimulation(state);
    assert.equal(state.usage.input, 0);
    assert.equal(state.usage.context, 0);
    assert.equal(state.usage.cost, 0);
    assert.deepEqual(state.completed, []);
  }
});

test("playing after a reply dismisses the game's done banner without clearing turn history", () => {
  let arcade = finish(submitPrompt(createSimulation("cc-arcade"), "Inspect the project"));
  const completedTurn = arcade.completed[0];
  arcade = applyDemoAction(arcade, { type: "arcade-move", direction: "left" });
  assert.equal(arcade.phase, "idle");
  assert.deepEqual(arcade.completed, [completedTurn]);

  let dinosaur = finish(submitPrompt(createSimulation("cc-dino"), "Inspect the project"));
  dinosaur = applyDemoAction(dinosaur, { type: "dino-jump" });
  assert.equal(dinosaur.phase, "idle");
  assert.equal(dinosaur.completed.length, 1);
  assert.equal(dinosaur.panel.paused, false);
});

test("Markdown navigation starts from the displayed README before moving to the next file", () => {
  let state = createSimulation("md-preview");
  state = applyDemoAction(state, { type: "navigate", delta: 1 });
  assert.equal(state.panel.selection, 1);
  state = applyDemoAction(state, { type: "navigate", delta: -1 });
  assert.equal(state.panel.selection, 0);
  state = applyDemoAction(state, { type: "navigate", delta: -1 });
  assert.equal(state.panel.selection, 1);
});

test("prompt rail navigation treats an unselected rail as the latest prompt", () => {
  let state = createSimulation("prompt-rail");
  state = finish(submitPrompt(state, "First task"));
  state = finish(submitPrompt(state, "Second task"));
  state = finish(submitPrompt(state, "Third task"));
  const previous = applyDemoAction(state, { type: "navigate", delta: -1 });
  assert.equal(previous.panel.selection, 1);
  const next = applyDemoAction(state, { type: "navigate", delta: 1 });
  assert.equal(next.panel.selection, 0);
});
test("transcript entries keep stable unique IDs when older conversation entries roll off", () => {
  let state = createSimulation("cctop");
  for (let turn = 0; turn < 8; turn += 1) {
    state = submitPrompt(state, `Request ${turn}`);
    for (let tick = 0; tick < 60; tick += 1) state = tickSimulation(state);
  }
  const previousEntries = state.transcript;
  state = submitPrompt(state, "Another request");
  for (const entry of previousEntries.slice(1)) {
    assert.ok(state.transcript.some(retained => retained.id === entry.id && retained === entry));
  }
  assert.equal(new Set(state.transcript.map(entry => entry.id)).size, state.transcript.length);
  assert.notEqual(state.transcript.at(-1)?.id, previousEntries.at(-1)?.id);
});
