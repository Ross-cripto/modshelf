"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Terminal } from "@xterm/xterm";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, RotateCcw, Undo2 } from "lucide-react";
import { BOARD_SIZE, type Direction } from "@/lib/cc-arcade-2048";
import { createOpeningState, getSwipeDirection } from "@/lib/arcade-demo";
import { createArcadeTerminalSession, type ArcadeTerminalSession, type TerminalSnapshot } from "@/lib/arcade-terminal-session";
import "@xterm/xterm/css/xterm.css";
import styles from "./arcade-2048.module.css";

const TERMINAL_FONT_SIZE = 13;
const TERMINAL_THEME = {
  background: "#0d0d0d", foreground: "#dedede", cursor: "#dedede",
  selectionBackground: "#53492e", selectionForeground: "#ffffff",
  black: "#0d0d0d", brightBlack: "#999999", white: "#dedede", brightWhite: "#ffffff",
  red: "#ed7878", brightRed: "#ff9999", green: "#94ce85", brightGreen: "#b6eea3",
  yellow: "#c8b65f", brightYellow: "#f1db71", blue: "#86a8f5", brightBlue: "#acc5ff",
  magenta: "#cba0e0", brightMagenta: "#edbbff", cyan: "#83ccd7", brightCyan: "#a8e9f0",
};

type SwipeStart = { x: number; y: number; pointerId: number };

function AccessibleBoard({ cells }: { cells: number[] }) {
  return (
    <div className="sr-only" role="grid" aria-label="2048 game board" aria-rowcount={BOARD_SIZE} aria-colcount={BOARD_SIZE}>
      {[0, 1, 2, 3].map((rowIndex) => (
        <div role="row" key={rowIndex}>
          {cells.slice(rowIndex * BOARD_SIZE, (rowIndex + 1) * BOARD_SIZE).map((value, columnIndex) => (
            <span role="gridcell" key={columnIndex} aria-label={value === 0 ? "Empty" : String(value)}>{value}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

export function Arcade2048() {
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const sessionRef = useRef<ArcadeTerminalSession | null>(null);
  const swipeStartRef = useRef<SwipeStart | null>(null);
  const [snapshot, setSnapshot] = useState<TerminalSnapshot>(() => ({ state: createOpeningState(), view: "game", focus: "prompt" }));
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    let resizeFrame = 0;
    let terminal: Terminal | undefined;
    let session: ArcadeTerminalSession | undefined;

    async function openTerminal() {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
        if (cancelled || !hostRef.current) return;
        terminal = new Terminal({ fontSize: TERMINAL_FONT_SIZE, fontFamily: "Menlo, Monaco, Consolas, monospace", lineHeight: 1.25, theme: TERMINAL_THEME, scrollback: 0, cursorBlink: false, screenReaderMode: true });
        const fit = new FitAddon();
        terminal.loadAddon(fit);
        terminal.open(hostRef.current);
        terminal.textarea?.setAttribute("aria-label", "Terminal input");
        fit.fit();
        session = createArcadeTerminalSession(terminal, setSnapshot);
        terminalRef.current = terminal;
        sessionRef.current = session;
        terminal.write("", () => { if (!cancelled) setLoadState("ready"); });
        observer = new ResizeObserver(() => {
          cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => { if (!cancelled) fit.fit(); });
        });
        observer.observe(hostRef.current);
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }
    openTerminal();
    return () => {
      cancelled = true;
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      session?.dispose();
      terminal?.dispose();
      terminalRef.current = null;
      sessionRef.current = null;
    };
  }, [loadAttempt]);

  function retryTerminal() { setLoadState("loading"); setLoadAttempt((attempt) => attempt + 1); }
  function move(direction: Direction) { sessionRef.current?.move(direction); }
  function restart() { sessionRef.current?.restart(); }
  function undo() { sessionRef.current?.undo(); }
  function focusGame() { sessionRef.current?.focusGame(); }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    const terminal = terminalRef.current;
    const screen = terminal?.element?.querySelector(".xterm-screen");
    if (!terminal || !screen) return;
    const rect = screen.getBoundingClientRect();
    const column = Math.floor((event.clientX - rect.left) / (rect.width / terminal.cols)) + 1;
    const row = Math.floor((event.clientY - rect.top) / (rect.height / terminal.rows)) + 1;
    if (sessionRef.current?.hitTarget(column, row) !== "board") return;
    focusGame();
    swipeStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    swipeStartRef.current = null;
    const direction = getSwipeDirection(start, { x: event.clientX, y: event.clientY });
    if (direction) move(direction);
  }

  function cancelSwipe() { swipeStartRef.current = null; }
  const gameIsUnavailable = loadState !== "ready" || snapshot.view !== "game";
  const movementIsUnavailable = gameIsUnavailable || snapshot.state.game.over;

  return (
    <section className={styles.game} aria-label="cc-arcade terminal preview">
      <div className={styles.terminal} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerCancel={cancelSwipe} onLostPointerCapture={cancelSwipe}>
        <div ref={hostRef} className={styles.terminalHost} />
        {loadState === "loading" && <p className={styles.terminalNotice} role="status">Loading terminal preview…</p>}
        {loadState === "error" && <div className={styles.terminalNotice} role="alert"><p>The terminal couldn’t load.</p><button type="button" onClick={retryTerminal}>Try again</button></div>}
      </div>
      <div className={styles.controls}>
        <div className={styles.directionControls} aria-label="Move tiles">
          <button type="button" aria-label="Move left" disabled={movementIsUnavailable} onClick={() => move("left")}><ArrowLeft size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Move up" disabled={movementIsUnavailable} onClick={() => move("up")}><ArrowUp size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Move down" disabled={movementIsUnavailable} onClick={() => move("down")}><ArrowDown size={19} aria-hidden="true" /></button>
          <button type="button" aria-label="Move right" disabled={movementIsUnavailable} onClick={() => move("right")}><ArrowRight size={19} aria-hidden="true" /></button>
        </div>
        <div className={styles.controlActions}>
          <button type="button" disabled={gameIsUnavailable} onClick={focusGame}><Gamepad2 size={16} aria-hidden="true" /> Play</button>
          <button type="button" disabled={loadState !== "ready"} onClick={restart}><RotateCcw size={15} aria-hidden="true" /> Restart</button>
          <button type="button" disabled={gameIsUnavailable || !snapshot.state.previousGame} onClick={undo}><Undo2 size={16} aria-hidden="true" /> Undo</button>
        </div>
      </div>
      <p id="game-instructions" className={styles.instructions}>Click the text board, then use arrows or WASD. R restarts. Esc returns to the prompt. On your phone, swipe the board or use the buttons.</p>
      <p className={styles.previewNote}>Browser preview · 2048 only · no Claude session connected.</p>
      {snapshot.view === "game" && <AccessibleBoard cells={snapshot.state.game.cells} />}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{snapshot.state.message} Score: {snapshot.state.game.score}. Best score: {snapshot.state.bestScore}. Keyboard focus: {snapshot.focus}.</p>
      <noscript><p className={styles.instructions}>Enable JavaScript to use this terminal preview.</p></noscript>
    </section>
  );
}
