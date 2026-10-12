// Adapted from sezaakgun/cc-arcade at 0baff06d31295850283c2eebe052f39bbc35473f.
// Copyright (c) 2026 Seza Akgün. MIT license: public/licenses/cc-arcade-MIT.txt.
export const BOARD_SIZE = 4;
export const WINNING_TILE = 2048;
const BOARD_CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
const SMALL_TILE_PROBABILITY = 0.9;

export type Direction = "left" | "right" | "up" | "down";
export type Game2048 = {
  cells: number[];
  score: number;
  won: boolean;
  over: boolean;
};

export function mergeLine(cells: number[]): { cells: number[]; gained: number } {
  const tiles = cells.filter((value) => value !== 0);
  const merged: number[] = [];
  let gained = 0;

  for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
    const value = tiles[tileIndex];
    if (value === tiles[tileIndex + 1]) {
      const mergedValue = value * 2;
      merged.push(mergedValue);
      gained += mergedValue;
      tileIndex++;
    } else {
      merged.push(value);
    }
  }

  while (merged.length < cells.length) merged.push(0);
  return { cells: merged, gained };
}

function getCellIndex(direction: Direction, lineIndex: number, position: number): number {
  switch (direction) {
    case "left": return lineIndex * BOARD_SIZE + position;
    case "right": return lineIndex * BOARD_SIZE + (BOARD_SIZE - 1 - position);
    case "up": return position * BOARD_SIZE + lineIndex;
    case "down": return (BOARD_SIZE - 1 - position) * BOARD_SIZE + lineIndex;
  }
}

function addRandomTile(cells: number[], random: () => number): number[] {
  const emptyIndices: number[] = [];
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
    if (cells[cellIndex] === 0) emptyIndices.push(cellIndex);
  }
  if (emptyIndices.length === 0) return cells;

  const nextCells = [...cells];
  const emptyIndex = Math.floor(random() * emptyIndices.length);
  const value = random() < SMALL_TILE_PROBABILITY ? 2 : 4;
  nextCells[emptyIndices[emptyIndex]] = value;
  return nextCells;
}

export function hasAvailableMove(cells: number[]): boolean {
  for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
    const value = cells[cellIndex];
    if (value === 0) return true;
    const hasMatchingRightNeighbor = cellIndex % BOARD_SIZE < BOARD_SIZE - 1 && value === cells[cellIndex + 1];
    if (hasMatchingRightNeighbor) return true;
    const hasMatchingLowerNeighbor = cellIndex + BOARD_SIZE < cells.length && value === cells[cellIndex + BOARD_SIZE];
    if (hasMatchingLowerNeighbor) return true;
  }
  return false;
}

export function createGame(random: () => number = Math.random): Game2048 {
  const emptyCells = Array<number>(BOARD_CELL_COUNT).fill(0);
  const cells = addRandomTile(addRandomTile(emptyCells, random), random);
  return { cells, score: 0, won: false, over: false };
}

export function moveGame(game: Game2048, direction: Direction, random: () => number = Math.random): Game2048 {
  if (game.over) return game;
  const cells = [...game.cells];
  let gained = 0;

  for (let lineIndex = 0; lineIndex < BOARD_SIZE; lineIndex++) {
    const line: number[] = [];
    for (let position = 0; position < BOARD_SIZE; position++) {
      line.push(game.cells[getCellIndex(direction, lineIndex, position)]);
    }
    const merged = mergeLine(line);
    for (let position = 0; position < BOARD_SIZE; position++) {
      cells[getCellIndex(direction, lineIndex, position)] = merged.cells[position];
    }
    gained += merged.gained;
  }

  const isUnchanged = cells.every((value, cellIndex) => value === game.cells[cellIndex]);
  if (isUnchanged) return game;
  const nextCells = addRandomTile(cells, random);
  return {
    cells: nextCells,
    score: game.score + gained,
    won: game.won || nextCells.includes(WINNING_TILE),
    over: !hasAvailableMove(nextCells),
  };
}
