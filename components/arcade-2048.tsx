"use client";

import { useEffect, useReducer, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Undo2 } from "lucide-react";
import { BOARD_SIZE, createGame, type Direction } from "@/lib/cc-arcade-2048";
import { createOpeningState, getKeyDirection, getSwipeDirection, reduceDemo } from "@/lib/arcade-demo";
import styles from "./arcade-2048.module.css";

const ROW_INDICES = [0, 1, 2, 3];
type SwipeStart = { x: number; y: number; pointerId: number };

function BoardRow({ cells, rowIndex }: { cells: number[]; rowIndex: number }) {
  return (
    <div className={styles.row} role="row" aria-rowindex={rowIndex + 1}>
      {cells.map((value, columnIndex) => (
        <div
          className={styles.tile}
          key={columnIndex}
          data-value={value}
          data-long={value >= 1024}
          role="gridcell"
          aria-colindex={columnIndex + 1}
          aria-label={value === 0 ? "Empty" : String(value)}
        >
          {value === 0 ? null : value}
        </div>
      ))}
    </div>
  );
}

export function Arcade2048() {
  const [state, dispatch] = useReducer(reduceDemo, undefined, createOpeningState);
  const boardRef = useRef<HTMLDivElement>(null);
  const swipeStartRef = useRef<SwipeStart | null>(null);
  const bestTile = Math.max(...state.game.cells);
  const isWinPending = state.game.won && !state.hasContinued && !state.game.over;
  const isPaused = state.game.over || isWinPending;

  useEffect(() => {
    boardRef.current?.focus({ preventScroll: true });
  }, []);

  function focusBoard() {
    boardRef.current?.focus({ preventScroll: true });
  }

  function playMove(direction: Direction) {
    dispatch({ type: "move", direction, positionSample: Math.random(), valueSample: Math.random() });
    focusBoard();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const direction = getKeyDirection(event.key);
    if (!direction) return;
    event.preventDefault();
    playMove(direction);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    focusBoard();
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    swipeStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    swipeStartRef.current = null;
    const direction = getSwipeDirection(start, { x: event.clientX, y: event.clientY });
    if (direction) playMove(direction);
  }

  function cancelSwipe() {
    swipeStartRef.current = null;
  }

  function startNewGame() {
    dispatch({ type: "reset", game: createGame() });
    focusBoard();
  }

  function undoMove() {
    dispatch({ type: "undo" });
    focusBoard();
  }

  function continueGame() {
    dispatch({ type: "continue" });
    focusBoard();
  }

  return (
    <section className={styles.game} aria-label="Play 2048">
      <div className={styles.gameToolbar}>
        <dl className={styles.scores}>
          <div><dt>Score</dt><dd aria-label={`Score: ${state.game.score}`}>{state.game.score}</dd></div>
          <div><dt>Best tile</dt><dd>{bestTile}</dd></div>
        </dl>
        <button className={`button button-outline ${styles.newGame}`} type="button" onClick={startNewGame}>
          <RotateCcw size={15} aria-hidden="true" />
          New game
        </button>
      </div>

      <div
        ref={boardRef}
        className={styles.board}
        role="grid"
        aria-label="2048 game board"
        aria-rowcount={BOARD_SIZE}
        aria-colcount={BOARD_SIZE}
        aria-describedby="game-instructions"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelSwipe}
        onLostPointerCapture={cancelSwipe}
      >
        {ROW_INDICES.map((rowIndex) => (
          <BoardRow key={rowIndex} rowIndex={rowIndex} cells={state.game.cells.slice(rowIndex * BOARD_SIZE, (rowIndex + 1) * BOARD_SIZE)} />
        ))}
      </div>

      <div className={styles.controls}>
        <div className={styles.directionControls} aria-label="Move tiles">
          <button type="button" aria-label="Move left" disabled={isPaused} onClick={() => playMove("left")}><ArrowLeft size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Move up" disabled={isPaused} onClick={() => playMove("up")}><ArrowUp size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Move down" disabled={isPaused} onClick={() => playMove("down")}><ArrowDown size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Move right" disabled={isPaused} onClick={() => playMove("right")}><ArrowRight size={19} aria-hidden="true" /></button>
        </div>
        <button className={styles.undo} type="button" disabled={!state.previousGame} onClick={undoMove}>
          <Undo2 size={16} aria-hidden="true" /> Undo
        </button>
      </div>
      <p id="game-instructions" className={styles.instructions}>
        Arrow keys or WASD. On your phone, swipe the board.
      </p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{state.message}</p>

      {isWinPending && (
        <div className={styles.result}>
          <div><h2>You made 2048.</h2><p>A good little break. Ready for another?</p></div>
          <button type="button" className="button button-rust" onClick={continueGame}>Keep playing <ArrowRight size={15} aria-hidden="true" /></button>
        </div>
      )}
      {state.game.over && (
        <div className={styles.result}>
          <div><h2>No moves left.</h2><p>Final score: {state.game.score}. Undo your last move or try again.</p></div>
          <button type="button" className="button button-rust" onClick={startNewGame}>Play again <RotateCcw size={15} aria-hidden="true" /></button>
        </div>
      )}
      <noscript><p className={styles.instructions}>Enable JavaScript to play this browser demo.</p></noscript>
    </section>
  );
}
