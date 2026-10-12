import test from "node:test";
import assert from "node:assert/strict";
import { createGame, hasAvailableMove, mergeLine, moveGame, type Game2048 } from "../lib/cc-arcade-2048.ts";
import { createDemoState, getKeyDirection, getSwipeDirection, reduceDemo } from "../lib/arcade-demo.ts";

function gameWithCells(cells: number[], score = 0): Game2048 {
  return { cells, score, won: false, over: false };
}

test("matching tiles merge once per move, with the merged values added to score", () => {
  assert.deepEqual(mergeLine([2, 2, 2, 2]), { cells: [4, 4, 0, 0], gained: 8 });
  assert.deepEqual(mergeLine([4, 4, 8, 0]), { cells: [8, 8, 0, 0], gained: 8 });
  assert.deepEqual(mergeLine([0, 2, 0, 2]), { cells: [4, 0, 0, 0], gained: 4 });
});

test("a new game starts with two tiles and uses the original 2-or-4 spawn rules", () => {
  const samples = [0, 0.89, 0, 0.9];
  let sampleIndex = 0;
  const game = createGame(() => samples[sampleIndex++]);
  assert.deepEqual(game, gameWithCells([2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
});

test("left and right moves merge in their travel direction and spawn one tile", () => {
  const original = gameWithCells([2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 10);
  assert.deepEqual(moveGame(original, "left", () => 0), gameWithCells([4, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 14));
  assert.deepEqual(moveGame(original, "right", () => 0), gameWithCells([2, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 14));
  assert.deepEqual(original.cells, [2, 2, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(original.score, 10);
});

test("up and down moves operate on columns", () => {
  const original = gameWithCells([2, 0, 0, 0, 2, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(moveGame(original, "up", () => 0), gameWithCells([4, 2, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 4));
  assert.deepEqual(moveGame(original, "down", () => 0), gameWithCells([2, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0], 4));
});

test("a move that changes nothing consumes no randomness and keeps the same game", () => {
  const original = gameWithCells([2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(moveGame(original, "left", () => { throw new Error("A blocked move must not spawn a tile"); }), original);
});

test("reaching 2048 sets a sticky win flag", () => {
  const original = gameWithCells([1024, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const winningGame = moveGame(original, "left", () => 0);
  assert.equal(winningGame.cells[0], 2048);
  assert.equal(winningGame.score, 2048);
  assert.equal(winningGame.won, true);
  assert.equal(moveGame(winningGame, "down", () => 0).won, true);
});

test("a final spawn can fill a board with no remaining moves", () => {
  const original = gameWithCells([4, 8, 4, 8, 8, 4, 8, 4, 4, 16, 32, 16, 8, 4, 8, 0]);
  const finalGame = moveGame(original, "right", () => 0);
  assert.deepEqual(finalGame.cells, [4, 8, 4, 8, 8, 4, 8, 4, 4, 16, 32, 16, 2, 8, 4, 8]);
  assert.equal(finalGame.over, true);
  assert.equal(moveGame(finalGame, "left", () => 0), finalGame);
});

test("available moves include empty cells and equal horizontal or vertical neighbors", () => {
  assert.equal(hasAvailableMove([2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]), false);
  assert.equal(hasAvailableMove([2, 2, 4, 8, 4, 8, 2, 4, 2, 4, 8, 2, 4, 8, 2, 4]), true);
  assert.equal(hasAvailableMove([2, 4, 8, 16, 2, 8, 16, 32, 4, 16, 32, 64, 8, 32, 64, 128]), true);
  assert.equal(hasAvailableMove([0, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]), true);
});

test("undo restores the previous board and score including the spawned tile", () => {
  const original = gameWithCells([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const state = createDemoState(original);
  const moved = reduceDemo(state, { type: "move", direction: "left", positionSample: 0, valueSample: 0 });
  assert.equal(moved.game.score, 4);
  const undone = reduceDemo(moved, { type: "undo" });
  assert.deepEqual(undone.game, original);
  assert.equal(undone.previousGame, null);
  assert.equal(reduceDemo(undone, { type: "undo" }), undone);
});

test("blocked moves do not overwrite the undo history", () => {
  const state = createDemoState(gameWithCells([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  const moved = reduceDemo(state, { type: "move", direction: "left", positionSample: 0, valueSample: 0 });
  const blocked = reduceDemo(moved, { type: "move", direction: "left", positionSample: 0, valueSample: 0 });
  assert.equal(blocked, moved);
  assert.deepEqual(reduceDemo(blocked, { type: "undo" }).game, state.game);
});

test("reaching 2048 continues automatically as in cc-arcade, and restart clears the board and undo state", () => {
  const state = createDemoState(gameWithCells([1024, 1024, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  const won = reduceDemo(state, { type: "move", direction: "left", positionSample: 0, valueSample: 0 });
  assert.notEqual(reduceDemo(won, { type: "move", direction: "down", positionSample: 0, valueSample: 0 }), won);
  const resetGame = createGame(() => 0.5);
  const reset = reduceDemo(won, { type: "reset", game: resetGame });
  assert.equal(reset.game, resetGame);
  assert.equal(reset.game.won, false);
  assert.equal(reset.previousGame, null);
});

test("best tracks completed scores rather than tile values and survives a restart", () => {
  const state = createDemoState(gameWithCells([4, 8, 4, 8, 8, 4, 8, 4, 4, 16, 32, 16, 8, 4, 8, 0], 100));
  const finished = reduceDemo(state, { type: "move", direction: "right", positionSample: 0, valueSample: 0 });
  assert.equal(finished.bestScore, 100);
  assert.equal(reduceDemo(finished, { type: "reset", game: createGame(() => 0.5) }).bestScore, 100);
  const playing = reduceDemo(createDemoState(gameWithCells([2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), { type: "move", direction: "left", positionSample: 0, valueSample: 0 });
  assert.equal(playing.bestScore, 0);
});

test("keyboard and swipe controls map directions without treating taps as moves", () => {
  assert.equal(getKeyDirection("ArrowLeft"), "left");
  assert.equal(getKeyDirection("ArrowRight"), "right");
  assert.equal(getKeyDirection("w"), "up");
  assert.equal(getKeyDirection("S"), "down");
  assert.equal(getKeyDirection("Tab"), null);
  assert.equal(getSwipeDirection({ x: 50, y: 50 }, { x: 5, y: 52 }), "left");
  assert.equal(getSwipeDirection({ x: 50, y: 50 }, { x: 90, y: 52 }), "right");
  assert.equal(getSwipeDirection({ x: 50, y: 50 }, { x: 52, y: 5 }), "up");
  assert.equal(getSwipeDirection({ x: 50, y: 50 }, { x: 52, y: 90 }), "down");
  assert.equal(getSwipeDirection({ x: 50, y: 50 }, { x: 65, y: 55 }), null);
});
