import { createGame, moveGame, type Direction, type Game2048 } from "./cc-arcade-2048.ts";
const MIN_SWIPE_DISTANCE = 24;
type Point = { x: number; y: number };
export type DemoState = { game: Game2048; previousGame: Game2048 | null; hasContinued: boolean; message: string };
export type DemoAction =
  | { type: "move"; direction: Direction; positionSample: number; valueSample: number }
  | { type: "undo" }
  | { type: "continue" }
  | { type: "reset"; game: Game2048 };
export function createDemoState(game: Game2048): DemoState {
  return { game, previousGame: null, hasContinued: false, message: "Combine matching tiles to reach 2048." };
}

export function createOpeningState(): DemoState {
  return createDemoState(createGame(() => 0.5));
}

function getMoveMessage(previousGame: Game2048, game: Game2048, direction: Direction): string {
  if (game.over) return `No moves left. Final score: ${game.score}. Start a new game or undo your last move.`;
  if (game.won && !previousGame.won) return "You made 2048! Keep playing or start a new game.";
  const gained = game.score - previousGame.score;
  if (gained > 0) return `Moved ${direction}. +${gained} points. Score: ${game.score}.`;
  return `Moved ${direction}. Score: ${game.score}.`;
}

function moveWithSamples(game: Game2048, action: Extract<DemoAction, { type: "move" }>): Game2048 {
  let sampleIndex = 0;
  function randomSample(): number {
    sampleIndex++;
    if (sampleIndex === 1) return action.positionSample;
    return action.valueSample;
  }
  return moveGame(game, action.direction, randomSample);
}

export function reduceDemo(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "reset": return createDemoState(action.game);
    case "undo": {
      if (!state.previousGame) return state;
      return {
        game: state.previousGame,
        previousGame: null,
        hasContinued: state.previousGame.won && state.hasContinued,
        message: `Last move undone. Score: ${state.previousGame.score}.`,
      };
    }
    case "continue": {
      if (!state.game.won || state.game.over || state.hasContinued) return state;
      return { ...state, hasContinued: true, message: "Keep going. How high can you get?" };
    }
    case "move": {
      if (state.game.over || (state.game.won && !state.hasContinued)) return state;
      const game = moveWithSamples(state.game, action);
      if (game === state.game) return state;
      return {
        ...state,
        game,
        previousGame: state.game,
        message: getMoveMessage(state.game, game, action.direction),
      };
    }
  }
}

export function getKeyDirection(key: string): Direction | null {
  switch (key.toLowerCase()) {
    case "arrowleft": case "a": return "left";
    case "arrowright": case "d": return "right";
    case "arrowup": case "w": return "up";
    case "arrowdown": case "s": return "down";
    default: return null;
  }
}

export function getSwipeDirection(start: Point, end: Point): Direction | null {
  const horizontalDistance = end.x - start.x;
  const verticalDistance = end.y - start.y;
  if (Math.max(Math.abs(horizontalDistance), Math.abs(verticalDistance)) < MIN_SWIPE_DISTANCE) return null;
  if (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)) {
    return horizontalDistance > 0 ? "right" : "left";
  }
  return verticalDistance > 0 ? "down" : "up";
}
