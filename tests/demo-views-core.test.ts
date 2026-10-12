import assert from "node:assert/strict";
import test from "node:test";
import { createSimulation } from "../lib/mod-simulation.ts";
import * as coreViews from "../lib/demo-views/core.ts";
const { renderCoreDemo } = coreViews;
import { stripAnsi, terminalCellWidth } from "../lib/demo-render.ts";
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
  assert.ok(panel.rows.some(row => row.targets.some(target => target.action.type === "close")));
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
  assert.match(panelText(renderCoreDemo(state, 60)), /No workflow has run/);
  state.transcript.push({ role: "tool", text: "Workflow fixture: research ×2 → implementation", turn: 1 });
  state.turn = 1;
  state.tick = 22;
  assert.match(panelText(renderCoreDemo(state, 60)), /researcher/);
  assert.match(panelText(renderCoreDemo(state, 60)), /running/);
  state.tick = 60;
  state.phase = "complete";
  assert.match(panelText(renderCoreDemo(state, 60)), /✔ 3\/3/);
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
  const idle = renderCoreDemo(state, 60).rows.map(row => row.text).join("\n");
  state.composerTyping = true;
  assert.notEqual(renderCoreDemo(state, 60).rows.map(row => row.text).join("\n"), idle);
});

test("dino paints the cactus at the same column used for collision", () => {
  const state = fixtureState("cc-dino");
  state.dino.obstacle = 6;
  state.dino.started = true;
  state.dino.obstacleKind = "tall";
  state.dino.jumpTicks = 4;
  const cactusRow = stripAnsi(renderCoreDemo(state, 50).rows[9].text);
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


test("arcade carries the native winning state and keyboard help in its status", () => {
  const state = fixtureState("cc-arcade");
  state.arcade.game.won = true;
  const panel = renderCoreDemo(state, 140);
  assert.match(panelText(panel), /2048 reached, keep going/);
  assert.match(panelText(panel), /click here, then arrows or wasd · r restarts/);
  assert.equal(panel.rows.filter(row => row.targets.some(target => target.action.type === "game-restart")).length, 0);
});

test("cctop marks the selected tab and exposes numbered native Overview cells", () => {
  const state = fixtureState("cctop");
  state.panel.selection = -1;
  const panel = renderCoreDemo(state, 80);
  assert.match(panel.rows[0].text, /\u001b\[7m Overview /);
  assert.match(panelText(panel), /1: ctx/);
  assert.match(panelText(panel), /4: spend/);
  assert.match(panelText(panel), /0: home/);
  assert.match(panelText(panel), /○ IDLE/);
  state.phase = "working";
  assert.match(panelText(renderCoreDemo(state, 80)), /● BUSY/);
});

test("flowpane opens an idle native view before Workflow and retains the finished graph on a new main turn", () => {
  const state = fixtureState("flowpane");
  assert.match(panelText(renderCoreDemo(state, 60)), /No workflow has run in this session yet/);
  state.transcript.push({ role: "tool", text: "Workflow fixture: research ×2 → implementation", turn: 1 });
  state.turn = 2;
  state.phase = "working";
  state.tick = 2;
  const panel = renderCoreDemo(state, 60);
  assert.match(panelText(panel), /✔ researcher/);
  assert.match(panelText(panel), /Sonnet 5/);
  assert.match(panelText(panel), /∑/);
  assert.match(panelText(panel), /⚙ Settings/);
});

test("flowpane agent details show one native tab at a time", () => {
  const state = fixtureState("flowpane");
  state.transcript.push({ role: "tool", text: "Workflow fixture: research ×2 → implementation", turn: 1 });
  state.turn = 1;
  state.phase = "complete";
  state.tick = 60;
  state.panel.tab = "details:Response";
  const panel = renderCoreDemo(state, 60);
  assert.match(panelText(panel), /Found the main feature/);
  assert.doesNotMatch(panelText(panel), /Inspect the app and identify/);
  assert.ok(panel.rows.some(row => row.targets.some(target => target.action.type === "tab" && target.action.value === "details:Tool Calls")));
});

test("mindful starts with empty lungs and uses native sip and hold phases", () => {
  const state = fixtureState("mindful-claude");
  state.phase = "working";
  state.panel.tab = "hrv:pulse";
  state.tick = 0;
  assert.doesNotMatch(panelText(renderCoreDemo(state, 60)), /[░▒▓█]/);
  state.panel.tab = "sigh:pulse";
  state.tick = 11;
  assert.match(panelText(renderCoreDemo(state, 60)), /Sip in... 1s/);
  state.panel.tab = "box:pulse";
  assert.match(panelText(renderCoreDemo(state, 60)), /Hold... 4s/);
  state.panel.tab = "478:pulse";
  assert.match(panelText(renderCoreDemo(state, 60)), /Hold... 7s/);
});

test("mindful applies delay and forwards the native phase to the spinner", () => {
  assert.ok("mindfulSpinnerMessage" in coreViews);
  const mindfulSpinnerMessage = coreViews.mindfulSpinnerMessage as (state: SimulationState) => string | null;
  const state = fixtureState("mindful-claude");
  state.phase = "working";
  state.panel.tab = "hrv:pulse";
  state.mindful.delaySeconds = 2;
  state.tick = 4;
  assert.equal(renderCoreDemo(state, 60).rows.length, 0);
  assert.equal(mindfulSpinnerMessage(state), null);
  state.tick = 6;
  assert.equal(mindfulSpinnerMessage(state), "Breathe in 4s");
  state.mindful.spinner = false;
  assert.equal(mindfulSpinnerMessage(state), null);
});

test("context lens does not fabricate a category breakdown when only total usage is available", () => {
  const state = fixtureState("context-lens");
  state.completed.push({ prompt: "Inspect", turn: 1, usage: { ...state.usage, context: 14 } });
  const panel = renderCoreDemo(state, 120);
  assert.doesNotMatch(panelText(panel), /system prompt|tool results|buffer/);
  assert.match(panelText(panel), /no category breakdown/);
  assert.match(panelText(panel), /window itself/);
});

test("context lens averages the last five rising turns even when later turns shrink", () => {
  const state = fixtureState("context-lens");
  const contextPercentages = [10, 20, 19, 18, 17, 16, 15];
  for (const [index, context] of contextPercentages.entries()) {
    state.completed.push({ prompt: "Inspect", turn: index + 1, usage: { ...state.usage, context } });
  }
  const panel = renderCoreDemo(state, 120);
  assert.equal(panel.status, "ctx 15% · 30.0k/200k · -2.0k last turn · 8 turns to full");
  assert.match(panelText(panel), /\+20.0k average over 1 turn/);
});

test("context lens clamps full-window forecasts and uses the native next-turn wording", () => {
  const state = fixtureState("context-lens");
  state.completed.push({ prompt: "Inspect", turn: 1, usage: { ...state.usage, context: 90 } });
  state.completed.push({ prompt: "Inspect", turn: 2, usage: { ...state.usage, context: 110 } });
  assert.equal(renderCoreDemo(state, 120).status, "ctx 110% · 220k/200k · +40.0k last turn · full next turn");
});

test("dino shows the native close row, ducking pose, best score and night colors", () => {
  const state = fixtureState("cc-dino");
  state.dino.started = true;
  state.dino.best = 800;
  state.dino.score = 701;
  state.dino.duckTicks = 2;
  const ducking = renderCoreDemo(state, 100);
  assert.ok(ducking.rows[0].targets.some(target => target.action.type === "close"));
  assert.match(panelText(ducking), /↓ ducks · night · best 800/);
  assert.ok(ducking.rows.some(row => row.text.includes("\u001b[34m")));
  state.dino.duckTicks = 0;
  assert.notEqual(panelText(renderCoreDemo(state, 100)), panelText(ducking));
});

test("clawd keeps its native orange outer arms and reserves the right-side stage for props", () => {
  const state = fixtureState("clawd-buddy");
  const panel = renderCoreDemo(state, 100);
  assert.equal(stripAnsi(panel.rows[4].text).indexOf("█"), 60);
  assert.doesNotMatch(panel.rows[4].text, /38;2;169;87;60/);
  state.phase = "complete";
  assert.doesNotMatch(panel.rows[4].text, /38;2;0;0;0/);
});

test("core native rows and hit targets fit narrow and wide terminal panes", () => {
  const identifiers: DemoId[] = ["cc-arcade", "cctop", "flowpane", "mindful-claude", "context-lens", "cc-dino", "clawd-buddy"];
  for (const identifier of identifiers) {
    const state = fixtureState(identifier);
    state.phase = "working";
    state.tick = 26;
    for (const columns of [35, 80]) {
      const panel = renderCoreDemo(state, columns);
      for (const row of panel.rows) {
        assert.ok(terminalCellWidth(row.text) <= columns, `${identifier}: ${stripAnsi(row.text)}`);
        for (const target of row.targets) assert.ok(target.column + target.width - 1 <= columns);
      }
    }
  }
});

test("flowpane layout controls change phase geometry instead of only their label", () => {
  const state = fixtureState("flowpane");
  state.phase = "complete";
  state.turn = 1;
  state.tick = 60;
  state.transcript.push({ role: "tool", text: "Workflow fixture: research ×2 → implementation", turn: 1 });
  state.panel.tab = "flow-horizontal";
  const horizontal = panelText(renderCoreDemo(state, 80));
  state.panel.tab = "flow-vertical";
  const vertical = panelText(renderCoreDemo(state, 80));
  assert.notEqual(horizontal, vertical);
  assert.ok(horizontal.split("\n").some(row => row.includes("Research") && row.includes("Implement")));
  state.panel.tab = "flow-timeline";
  assert.match(panelText(renderCoreDemo(state, 80)), /[━─]{3}/);
});

test("context lens uses supplied compaction threshold and orders real categories", () => {
  const state = fixtureState("context-lens");
  const usage = { ...state.usage, context: 80 };
  state.completed.push({ prompt: "First", turn: 1, usage: { ...usage, context: 60 } }, { prompt: "Second", turn: 2, usage });
  state.contextLens = { window: 1_000_000, threshold: 850_000, model: "claude-fable-5-1", detail: "full", categories: [
    { name: "Free Space", tokens: 200_000, color: "inactive", kind: "free", isDeferred: false },
    { name: "Deferred", tokens: 900_000, color: "error", kind: "used", isDeferred: true },
    { name: "Messages", tokens: 700_000, color: "success", kind: "used", isDeferred: false },
    { name: "System Prompt", tokens: 100_000, color: "warning", kind: "used", isDeferred: false },
    { name: "Auto-compact Buffer", tokens: 50_000, color: "inactive", kind: "buffer", isDeferred: false },
  ] };
  const panel = renderCoreDemo(state, 100);
  const text = panelText(panel);
  assert.match(panel.status ?? "", /compact next turn/);
  assert.match(text, /800k of 1\.0M.*claude-fable-5-1/);
  assert.match(text, /850k, where auto-compaction runs/);
  assert.match(text, /exactly, with the token-count API/);
  assert.doesNotMatch(text, /Deferred|no category breakdown/);
  assert.ok(text.indexOf("messages") < text.indexOf("system prompt"));
  assert.ok(text.indexOf("system prompt") < text.indexOf("auto-compact buffer"));
  assert.ok(text.indexOf("auto-compact buffer") < text.indexOf("free space"));
});

test("flowpane agent detail keeps a dim graph underneath and blocks its hit targets", () => {
  const state = fixtureState("flowpane");
  state.phase = "complete";
  state.turn = 1;
  state.tick = 60;
  state.transcript.push({ role: "tool", text: "Workflow fixture", turn: 1 });
  state.panel.tab = "details:Prompt";
  const panel = renderCoreDemo(state, 100);
  assert.ok(panel.rows.some(row => row.text.includes("\u001b[2m")));
  assert.match(panelText(panel), /Research/);
  assert.ok(panel.rows.every(row => row.targets.every(target => target.action.type !== "select")));
});

test("context lens keeps exact token counts despite rounded percentages", () => {
  const state = fixtureState("context-lens");
  state.completed.push({ prompt: "First", turn: 1, usage: { ...state.usage, context: 5 }, contextTokens: 45_900 }, { prompt: "Second", turn: 2, usage: { ...state.usage, context: 5 }, contextTokens: 53_900 });
  state.contextLens = { tokens: 53_900, window: 1_000_000, threshold: 800_000, model: "claude-opus-5", detail: "summary", categories: [] };
  assert.equal(renderCoreDemo(state, 100).status, "ctx 5% · 53.9k/1.0M · +8.0k last turn · 93 turns to compact");
});

test("flowpane detail close retains the selected graph layout", () => {
  const state = fixtureState("flowpane");
  state.panel.tab = "details:Response";
  state.flowLayout = "flow-timeline";
  const panel = renderCoreDemo(state, 80);
  const close = panel.rows.flatMap(row => row.targets).find(target => target.key === "Escape");
  assert.deepEqual(close?.action, { type: "tab", value: "flow-timeline" });
});
