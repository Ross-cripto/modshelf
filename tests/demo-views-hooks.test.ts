import assert from "node:assert/strict";
import test from "node:test";
import { createSimulation } from "../lib/mod-simulation.ts";
import { stripAnsi, terminalCellWidth } from "../lib/demo-render.ts";
import { renderHooksDemo } from "../lib/demo-views/hooks.ts";
import type { SimulationState } from "../lib/demo-types.ts";
import type { DemoId } from "../lib/mod-demos.ts";

function fixtureState(modId: DemoId): SimulationState {
  const state = createSimulation(modId);
  return { ...state, panel: { ...state.panel, open: false, selection: 0 }, playback: { ...state.playback, position: 12 } };
}

function panelText(state: SimulationState, columns = 100): string {
  const panel = renderHooksDemo(state, columns);
  return stripAnsi(panel.rows.map(row => row.text).join("\n") + "\n" + (panel.status ?? ""));
}

test("quota holds the startup and last completed samples while tools run", () => {
  const state = fixtureState("quota-meter");
  state.panel.open = true;
  state.phase = "working";
  state.tick = 40;
  assert.match(panelText(state), /42% used/);

  state.completed = [{ prompt: "Check the project", turn: 1, usage: { input: 1200, output: 260, cached: 900, cost: 0.012, context: 7, fiveHour: 42, sevenDay: 18 } }];
  state.usage.fiveHour = 73;
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
  assert.match(panelText(state), /1\.2k/);
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
  assert.match(text, /\$0.0260 session/);
  assert.match(text, /last turn \$0.0140/);
  assert.match(text, /cache 43%/);
  assert.doesNotMatch(text, /\$0.038/);
});

test("budget guard stays quiet below its warning threshold and offers a one-turn override only at the gate", () => {
  const state = fixtureState("budget-guard");
  assert.equal(renderHooksDemo(state, 50).rows.length, 0);
  assert.equal(renderHooksDemo(state, 50).status, undefined);
  state.budget.dollars = 0.02;
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
  state.panel.ascii = true;
  assert.match(panelText(state), /\+---------\+/);
  assert.doesNotMatch(panelText(state), /```mermaid/);
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
  assert.match(panelText(state), /read:/);
  assert.match(panelText(state), /edit:/);
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
  state.markdownFiles = ["CONTRIBUTING.md", "README.md"];
  state.notice = "README.md changed · /md to preview";
  assert.equal(renderHooksDemo(state, 58).rows.length, 0);
  state.panel.open = true;
  state.panel.tab = "Single";
  assert.match(panelText(state), /CONTRIBUTING.md/);
  assert.equal(renderHooksDemo(state, 58).graphic, "markdown");
  state.panel.selection = 1;
  assert.match(panelText(state), /README.md/);
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
  assert.match(words, /change the database schema \(not previewable here\)/);
  assert.match(words, /uncommitted M prisma\/schema.prisma/);
  assert.match(words, /auto-cancels in 60 s/);
  assert.ok(panel.rows.some(row => row.targets.some(target => target.action.type === "proceed")));
});

test("quota draws its session-start reading, native reset clock and collecting projection", () => {
  const state = fixtureState("quota-meter");
  state.usage.fiveHour = 42;
  state.usage.sevenDay = 18;
  state.panel.open = true;
  const text = panelText(state);
  assert.match(text, /5-hour limit · 42% used/);
  assert.match(text, /7-day limit · 18% used/);
  assert.match(text, /burn rate: collecting \(needs samples over 15m\)/);
  assert.match(text, /burn rate: collecting \(needs samples over 8h24m\)/);
  assert.match(text, /projection: collecting/);
  assert.match(text, /5h 42% \(resets 3h42m\)/);
  assert.equal(renderHooksDemo(state, 100).rows.flatMap(row => row.targets).length, 0);
  state.clockTick = 150;
  assert.match(panelText(state), /resets 3h41m/);
});

test("ledger sums fresh and cached input in the status and drops low-priority columns on phones", () => {
  const state = fixtureState("token-ledger");
  state.panel.open = true;
  state.completed = [{ prompt: "First", turn: 1, usage: { input: 1200, output: 260, cached: 900, cost: 0.012, context: 7, fiveHour: 42, sevenDay: 18 } }];
  const wide = renderHooksDemo(state, 100);
  assert.match(wide.status ?? "", /2\.1k in \/ 260 out/);
  assert.match(panelText(state), /cache r\s+cache w\s+hit\s+time\s+cost/);
  assert.match(panelText(state), /\$0\.0120/);
  const phone = renderHooksDemo(state, 24);
  for (const row of phone.rows) assert.ok(terminalCellWidth(row.text) <= 24);
  assert.match(stripAnsi(phone.rows[0].text), /in\s+out/);
  assert.match(stripAnsi(phone.rows[0].text), /cost/);
  assert.doesNotMatch(stripAnsi(phone.rows[0].text), /time|cache w|model/);
});

test("budget status keeps a reached window visible during a one-turn override", () => {
  const state = fixtureState("budget-guard");
  state.budget.dollars = 0;
  state.budget.fiveHourLimit = 90;
  state.budget.sevenDayLimit = 95;
  state.usage.fiveHour = 90;
  state.usage.sevenDay = 18;
  state.budget.overridden = true;
  assert.match(renderHooksDemo(state, 80).status ?? "", /5h 90\/90% · 7d 18\/95% · over limit/);
});

test("Mermaid matches upstream five-row layout and colors labels separately from arrows", () => {
  const state = fixtureState("mermaid-draw");
  state.prompt = "Draw a diagram";
  state.phase = "complete";
  state.tick = 60;
  const panel = renderHooksDemo(state, 100);
  assert.ok(panel.rows.some(row => stripAnsi(row.text).includes("│ Request ├────►│ Plan ├────►│ Result │")));
  const labeled = panel.rows.find(row => row.text.includes("Request"));
  assert.ok(labeled);
  assert.match(labeled.text, /\u001b\[36m├\u001b\[0m\u001b\[2m────\u001b\[0m\u001b\[33m►/);
  assert.doesNotMatch(labeled.text, /\u001b\[36mRequest/);
  const phone = panelText(state, 37);
  assert.match(phone, /▼/);
  assert.doesNotMatch(phone, /►/);
});

test("queue keeps native row controls beside text and exposes sending only while idle", () => {
  const state = fixtureState("prompt-queue");
  state.queue = ["Add tests", "Update the docs"];
  state.phase = "working";
  let panel = renderHooksDemo(state, 100);
  assert.match(panelText(state), /queued · 2 · sent when the turn ends/);
  const first = panel.rows.find(row => stripAnsi(row.text).includes("Add tests"));
  assert.ok(first);
  assert.ok(first.targets.some(target => target.action.type === "queue-now"));
  assert.ok(first.targets.some(target => target.action.type === "queue-edit"));
  assert.ok(!panel.rows.some(row => row.targets.some(target => target.action.type === "queue-send")));
  state.phase = "idle";
  panel = renderHooksDemo(state, 100);
  assert.ok(panel.rows.some(row => row.targets.some(target => target.action.type === "queue-send")));
  state.phase = "working";
  state.steering = ["Keep the tests focused"];
  panel = renderHooksDemo(state, 100);
  assert.match(panelText(state), /waiting for the next tool call/);
  assert.ok(panel.rows.some(row => row.targets.some(target => target.action.type === "queue-unsteer")));
});

test("Mission Control uses native icons and a timed summary band independent of pane visibility", () => {
  const state = fixtureState("mission-control");
  state.phase = "working";
  state.turn = 1;
  state.tick = 34;
  state.clockTick = 34;
  state.prompt = "Review the project";
  const closed = renderHooksDemo(state, 100);
  assert.equal(closed.rows.length, 0);
  assert.match(stripAnsi(closed.bandRows?.[0]?.text ?? ""), /◈ mission: 1\/1 agents · 3 tools · 1 files changed/);
  state.panel.open = true;
  assert.match(panelText(state), /◆ main/);
  assert.match(panelText(state), /◉ read:/);
  assert.match(panelText(state), /✎ edit:/);
  assert.match(panelText(state), /1 agents \(1 running\) · 3 tool calls/);
  state.phase = "complete";
  state.tick = 60;
  state.clockTick = 136;
  assert.equal(renderHooksDemo(state, 100).bandRows?.length ?? 0, 0);
});

test("Blast Radius identifies the native risk kind and measures fixture effects", () => {
  const state = fixtureState("blast-radius");
  state.decision = "command";
  state.prompt = "Delete generated files";
  assert.match(panelText(state), /⚠ Blast Radius held a command \(Deletes files\)/);
  assert.match(panelText(state), /delete 5 files \(240 KB\)/);
  assert.doesNotMatch(panelText(state), /… \d+ more/);
  const heading = renderHooksDemo(state, 100).rows[0].text;
  assert.match(heading, /\u001b\[1;31m⚠ Blast Radius held a command/);
  assert.match(heading, /\u001b\[2m\(Deletes files\)/);
  assert.doesNotMatch(panelText(state), /unaffected|fictional fixtures/);
  state.prompt = "Force-push the branch";
  assert.match(panelText(state), /\(Force push\)/);
  assert.match(panelText(state), /2 remote commits lost, 3 pushed/);
  state.prompt = "Run a migration";
  assert.match(panelText(state), /\(Database migration\)/);
  assert.match(panelText(state), /change the database schema \(not previewable here\)/);
});

test("Markdown preview follows actual edited paths, renders native text and keeps Render and Browser controls", () => {
  const state = fixtureState("md-preview");
  state.panel.open = true;
  state.markdownFiles = ["README.md"];
  state.markdownEditedFiles = ["README.md"];
  state.panel.rendered = false;
  const text = panelText(state);
  assert.match(text, /README.md  1\/1/);
  assert.match(text, /Example project/);
  assert.doesNotMatch(text, /# Example|local fixture|md-preview: README.md edited/);
  const actions = renderHooksDemo(state, 100).rows.flatMap(row => row.targets.map(target => target.action.type));
  assert.ok(actions.includes("md-refresh"));
  assert.ok(actions.includes("md-browser"));
  state.panel.tab = "Before";
  assert.match(panelText(state), /── Before ──/);
  assert.match(panelText(state), /── After ──/);
  assert.doesNotMatch(panelText(state), /\+ #|\- #/);
});

test("Now Playing keeps one-line transport and native thin progress with narrow controls intact", () => {
  const state = fixtureState("now-playing");
  state.panel.open = true;
  state.playback.position = 65;
  const panel = renderHooksDemo(state, 110);
  assert.equal(panel.rows[0].targets.length, 3);
  assert.match(stripAnsi(panel.rows[0].text), /🎵 Paper Satellites ·/);
  assert.match(stripAnsi(panel.rows[0].text), /━─|━━|──/);
  assert.doesNotMatch(stripAnsi(panel.rows[0].text), /█|░/);
  assert.match(stripAnsi(panel.rows[0].text), /1:05/);
  assert.match(stripAnsi(panel.rows[0].text), /\[ ⏮ \]\[ ⏸ \]\[ ⏭ \]/);
  const phone = renderHooksDemo(state, 37);
  assert.equal(phone.rows[0].targets.length, 3);
  assert.ok(phone.rows[0].targets.every(target => target.column + target.width - 1 <= 37));
  assert.ok(terminalCellWidth(phone.rows[0].text) <= 37);
  const beginning = panelText({ ...state, playback: { ...state.playback, position: 12 } });
  assert.notEqual(panelText(state), beginning);
});

test("quota projections use the sample span and clear their slope when a window resets", () => {
  const state = fixtureState("quota-meter");
  state.panel.open = true;
  state.clockTick = 4500;
  state.completed = [{ prompt: "Long task", turn: 1, completedAtTick: 3000, usage: { input: 1200, output: 260, cached: 900, cost: 0.012, context: 7, fiveHour: 60, sevenDay: 18 } }];
  assert.match(panelText(state), /burn 36\.0%\/h over the last 30m/);
  assert.match(panelText(state), /projection: 100% in ~1h07m/);
  state.completed.push({ prompt: "After reset", turn: 2, completedAtTick: 4499, usage: { input: 1200, output: 260, cached: 900, cost: 0.026, context: 14, fiveHour: 2, sevenDay: 18 } });
  assert.match(panelText(state), /5-hour limit · 2% used[\s\S]*burn rate: collecting/);
  assert.doesNotMatch(panelText(state), /burn -/);
});

test("ledger uses already-recorded cost deltas after old history is trimmed and identifies subagent rows", () => {
  const state = fixtureState("token-ledger");
  state.panel.open = true;
  state.completed = [{ prompt: "Retained turn", turn: 201, model: "opus-4-5", costDelta: 0.014, subagent: true, cacheWrite: 400, durationMs: 1900, usage: { input: 1200, output: 260, cached: 900, cost: 3.25, context: 7, fiveHour: 42, sevenDay: 18 } }];
  assert.match(panelText(state), /201\*/);
  assert.match(panelText(state), /opus-4-5/);
  assert.match(panelText(state), /\$0\.0140/);
  assert.match(panelText(state), /\$3\.25 session/);
  assert.match(panelText(state), /\* subagent turn/);
  assert.match(panelText(state), /2\.5k in/);
});

test("mission summary expires from its actual completion time after a second turn", () => {
  const state = fixtureState("mission-control");
  state.turn = 2;
  state.tick = 60;
  state.clockTick = 200;
  state.phase = "complete";
  state.completed = [{ prompt: "Second", turn: 2, completedAtTick: 190, usage: { input: 0, output: 0, cached: 0, cost: 0, context: 0, fiveHour: 0, sevenDay: 0 } }];
  assert.equal(renderHooksDemo(state, 100).bandRows?.length, 1);
  state.clockTick = 265;
  assert.equal(renderHooksDemo(state, 100).bandRows?.length, 0);
});

test("Markdown pair view compares the requested files without adding before snapshots", () => {
  const state = fixtureState("md-preview");
  state.markdownFiles = ["README.md", "CONTRIBUTING.md"];
  state.markdownEditedFiles = ["README.md", "CONTRIBUTING.md"];
  state.markdownPair = ["README.md", "CONTRIBUTING.md"];
  state.panel.open = true;
  state.panel.tab = "Pair";
  state.panel.rendered = false;
  const text = panelText(state);
  assert.match(text, /README.md \| CONTRIBUTING.md  side by side/);
  assert.match(text, /── README.md ──/);
  assert.match(text, /── CONTRIBUTING.md ──/);
  assert.doesNotMatch(text, /── Before ──|── After ──/);
  state.panel.selection = -1;
  state.panel.tab = "Single";
  assert.match(panelText(state), /CONTRIBUTING.md  2\/2/);
});

test("Markdown named-file opening shows current unedited content and has no earlier snapshot", () => {
  const state = fixtureState("md-preview");
  state.markdownFiles = ["README.md"];
  state.panel.open = true;
  state.panel.rendered = false;
  assert.match(panelText(state), /A small terminal application\./);
  assert.doesNotMatch(panelText(state), /Getting started|green bar|▌/);
  state.panel.tab = "Before";
  assert.match(panelText(state), /new file, no earlier version/);
  assert.doesNotMatch(panelText(state), /── Before ──|── After ──/);
  state.markdownEditedFiles = ["README.md"];
  assert.match(panelText(state), /Getting started/);
  assert.match(panelText(state), /before \| after/);
});

test("Markdown text uses native colored headings, rules and changed top-level paragraphs", () => {
  const state = fixtureState("md-preview");
  state.markdownFiles = ["CONTRIBUTING.md"];
  state.markdownEditedFiles = ["CONTRIBUTING.md"];
  state.panel.open = true;
  state.panel.rendered = false;
  const panel = renderHooksDemo(state, 160);
  const heading = panel.rows.find(row => stripAnsi(row.text).trim() === "Contributing");
  assert.ok(heading);
  assert.match(heading.text, /\u001b\[1;35mContributing/);
  assert.ok(panel.rows.some(row => stripAnsi(row.text).trim() === "─".repeat(12)));
  const unchanged = panel.rows.find(row => stripAnsi(row.text).includes("Open an issue"));
  assert.ok(unchanged);
  assert.doesNotMatch(unchanged.text, /▌/);
  const paragraph = panel.rows.find(row => stripAnsi(row.text).includes("Run the focused tests"));
  assert.ok(paragraph);
  assert.match(stripAnsi(paragraph.text), /▌Run the focused tests before opening a pull request\./);
  assert.doesNotMatch(heading.text, /▌/);
});

test("native queue controls stay inside phone rows and steering is removable", () => {
  const state = fixtureState("prompt-queue");
  state.phase = "working";
  state.queue = ["Write a very long descriptive task for the next turn", "Add tests"];
  state.steering = ["Use the updated file"];
  const panel = renderHooksDemo(state, 37);
  for (const row of panel.rows) {
    assert.ok(terminalCellWidth(row.text) <= 37);
    assert.ok(row.targets.every(target => target.column + target.width - 1 <= 37));
  }
  assert.ok(panel.rows.some(row => row.targets.some(target => target.action.type === "queue-unsteer")));
});
