import assert from "node:assert/strict";
import test from "node:test";
import { createSimulation } from "../lib/mod-simulation.ts";
import { stripAnsi } from "../lib/demo-render.ts";
import { renderHooksDemo } from "../lib/demo-views/hooks.ts";
import type { SimulationState } from "../lib/demo-types.ts";
import type { DemoId } from "../lib/mod-demos.ts";

function fixtureState(modId: DemoId): SimulationState {
  const state = createSimulation(modId);
  return { ...state, panel: { ...state.panel, open: false, selection: 0 }, playback: { ...state.playback, position: 12 } };
}

function panelText(state: SimulationState): string {
  const panel = renderHooksDemo(state, 58);
  return stripAnsi(panel.rows.map(row => row.text).join("\n") + "\n" + (panel.status ?? ""));
}

test("quota remains unreported until a turn completes, then holds the sampled limits while tools run", () => {
  const state = fixtureState("quota-meter");
  state.panel.open = true;
  state.phase = "working";
  state.tick = 40;
  state.usage.fiveHour = 73;
  assert.match(panelText(state), /No plan limits reported yet/);

  state.completed = [{ prompt: "Check the project", turn: 1, usage: { input: 1200, output: 260, cached: 900, cost: 0.012, context: 7, fiveHour: 42, sevenDay: 18 } }];
  assert.match(panelText(state), /42% used/);
  assert.doesNotMatch(panelText(state), /73%/);
});

test("ledger shows no row during a running first turn and records completed usage newest first", () => {
  const state = fixtureState("token-ledger");
  state.panel.open = true;
  state.phase = "working";
  state.tick = 55;
  assert.match(panelText(state), /No turns yet/);
  state.completed = [{ prompt: "First", turn: 1, usage: { input: 1200, output: 260, cached: 900, cost: 0.012, context: 7, fiveHour: 42, sevenDay: 18 } }];
  assert.match(panelText(state), /1,200/);
  assert.match(panelText(state), /260/);
});

test("ledger uses session-cost deltas rather than charging cumulative cost twice", () => {
  const state = fixtureState("token-ledger");
  state.panel.open = true;
  state.completed = [
    { prompt: "First", turn: 1, usage: { input: 1200, output: 260, cached: 900, cost: 0.012, context: 7, fiveHour: 42, sevenDay: 18 } },
    { prompt: "Second", turn: 2, usage: { input: 1200, output: 260, cached: 900, cost: 0.026, context: 14, fiveHour: 44, sevenDay: 19 } },
  ];
  const text = panelText(state);
  assert.match(text, /session \$0.026/);
  assert.match(text, /last \$0.014/);
  assert.match(text, /cache 43%/);
  assert.doesNotMatch(text, /\$0.038/);
});

test("budget guard stays quiet below its warning threshold and offers a one-turn override only at the gate", () => {
  const state = fixtureState("budget-guard");
  assert.equal(renderHooksDemo(state, 50).rows.length, 0);
  assert.equal(renderHooksDemo(state, 50).status, undefined);
  state.usage.cost = 0.021;
  state.decision = "budget";
  state.phase = "decision";
  const panel = renderHooksDemo(state, 50);
  const actions = panel.rows.flatMap(row => row.targets.map(target => target.action.type));
  assert.deepEqual(actions, ["override", "deny"]);
});

test("Mermaid leaves an unfinished fence intact and converts only the completed reply", () => {
  const state = fixtureState("mermaid-draw");
  state.phase = "working";
  state.tick = 55;
  state.prompt = "Draw the request flow";
  assert.match(panelText(state), /```mermaid/);
  assert.doesNotMatch(panelText(state), /┌/);
  state.phase = "complete";
  state.tick = 60;
  assert.match(panelText(state), /┌/);
  assert.doesNotMatch(panelText(state), /```mermaid/);
  state.panel.rendered = false;
  assert.match(panelText(state), /```mermaid[\s\S]*```/);
});

test("Mermaid does not invent a diagram for an ordinary reply", () => {
  const state = fixtureState("mermaid-draw");
  state.phase = "complete";
  state.tick = 60;
  state.prompt = "Hello there";
  assert.equal(renderHooksDemo(state, 58).rows.length, 0);
});

test("prompt queue appears only for explicit queued or steered messages and keeps per-row action indices", () => {
  const state = fixtureState("prompt-queue");
  state.phase = "working";
  state.prompt = "Fix the button";
  assert.equal(renderHooksDemo(state, 58).rows.length, 0);
  state.queue = ["Add tests", "Update the docs"];
  const panel = renderHooksDemo(state, 58);
  const sendActions = panel.rows.flatMap(row => row.targets.map(target => target.action)).filter(action => action.type === "queue-now");
  assert.deepEqual(sendActions, [{ type: "queue-now", index: 0 }, { type: "queue-now", index: 1 }]);
  assert.match(panelText(state), /Add tests/);
  assert.match(panelText(state), /Update the docs/);
});

test("Mission Control fills the Who tree from tool events and uses the file graphic for Code", () => {
  const state = fixtureState("mission-control");
  state.panel.open = true;
  assert.match(panelText(state), /Nothing yet/);
  state.phase = "working";
  state.tick = 34;
  state.turn = 1;
  assert.match(panelText(state), /Read/);
  assert.match(panelText(state), /Edit/);
  assert.match(panelText(state), /agent/);
  state.panel.tab = "Code";
  assert.equal(renderHooksDemo(state, 58).graphic, "files");
});

test("Blast Radius has no passive pane and defaults its held command to Cancel", () => {
  const state = fixtureState("blast-radius");
  assert.equal(renderHooksDemo(state, 50).rows.length, 0);
  state.decision = "command";
  state.phase = "decision";
  state.prompt = "Delete generated files";
  const panel = renderHooksDemo(state, 50);
  const actions = panel.rows.flatMap(row => row.targets.map(target => target.action.type));
  assert.deepEqual(actions, ["deny", "proceed"]);
  assert.match(panelText(state), /auto-cancels in 60 s/);
});

test("Markdown edits notify without opening a pane and an explicitly opened preview switches between files", () => {
  const state = fixtureState("md-preview");
  state.phase = "working";
  state.tick = 34;
  state.turn = 1;
  assert.equal(renderHooksDemo(state, 58).rows.length, 0);
  assert.match(renderHooksDemo(state, 58).status ?? "", /README.md/);
  state.panel.open = true;
  state.panel.tab = "Single";
  assert.match(panelText(state), /README.md/);
  assert.equal(renderHooksDemo(state, 58).graphic, "markdown");
  state.panel.selection = 1;
  assert.match(panelText(state), /CONTRIBUTING.md/);
  state.panel.rendered = false;
  assert.equal(renderHooksDemo(state, 58).graphic, undefined);
});

test("Now Playing runs while Claude is idle and hides progress and lyrics when paused", () => {
  const state = fixtureState("now-playing");
  state.panel.open = true;
  assert.match(panelText(state), /0:12/);
  assert.match(panelText(state), /♪/);
  state.playback.playing = false;
  assert.doesNotMatch(panelText(state), /0:12/);
  assert.doesNotMatch(panelText(state), /♪/);
  const actions = renderHooksDemo(state, 58).rows.flatMap(row => row.targets.map(target => target.action.type));
  assert.deepEqual(actions, ["music-prev", "music-toggle", "music-next"]);
});
test("phone guard explanations wrap completely while retaining decision controls", () => {
  const state = fixtureState("blast-radius");
  state.prompt = "Remove the database schema";
  state.decision = "command";
  const panel = renderHooksDemo(state, 37);
  const words = panel.rows.map(row => stripAnsi(row.text).trim()).join(" ");
  assert.match(words, /Database impact cannot be previewed safely\./);
  assert.match(words, /Review the migration before proceeding/);
  assert.match(words, /auto-cancels in 60 s/);
  assert.ok(panel.rows.some(row => row.targets.some(target => target.action.type === "proceed")));
});
