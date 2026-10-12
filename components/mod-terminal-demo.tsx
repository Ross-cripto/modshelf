"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Terminal } from "@xterm/xterm";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Square } from "lucide-react";
import type { DemoId } from "@/lib/mod-demos";
import type { DemoAction, SimulationState } from "@/lib/demo-types";
import { getDemoDefinition } from "@/lib/demo-registry";
import { createSimulation } from "@/lib/mod-simulation";
import { SIMULATION_TICK_MS, MAX_PROMPT_LENGTH } from "@/lib/demo-config";
import { createModTerminalSession, type ModTerminalSession } from "@/lib/mod-terminal-session";
import type { DemoTerminalFrame } from "@/lib/demo-terminal-frame";
import { getMarkdownFixture, markdownShowsBefore, parseMarkdownLines, selectedMarkdownPath, type MarkdownBlock } from "@/lib/demo-markdown";
import { stripAnsi } from "@/lib/demo-render";
import { browserContextPrompt } from "@/lib/demo-fixtures";
import { copyDemoText, getDemoControls, sessionStatusMessage, supplementalControls } from "@/lib/demo-ui";
import "@xterm/xterm/css/xterm.css";
import styles from "./mod-terminal-demo.module.css";

const TERMINAL_THEME = { background: "#0d0d0d", foreground: "#dedede", cursor: "#dedede", selectionBackground: "#53492e", black: "#0d0d0d", brightBlack: "#999999", white: "#dedede", brightWhite: "#ffffff", red: "#ed7878", brightRed: "#ff9999", green: "#94ce85", brightGreen: "#b6eea3", yellow: "#c8b65f", brightYellow: "#f1db71", blue: "#86a8f5", brightBlue: "#acc5ff", magenta: "#cba0e0", brightMagenta: "#edbbff", cyan: "#83ccd7", brightCyan: "#a8e9f0" };
const COPY_CODE = "export function summarize(input: string) {\n  return input.trim();\n}";
const COPY_TABLE = "| Change | Result |\n| --- | --- |\n| Handler | Simplified |\n| Checks | Passing |";
type Geometry = { width: number; height: number };

function controlLabel(label: string): string {
  const labels: Record<string, string> = { "←": "Move left", "↑": "Move up", "↓": "Move down", "→": "Move right" };
  return labels[label] ?? label;
}

function ControlContent({ action, label }: { action: DemoAction; label: string }) {
  if (action.type !== "arcade-move") return label;
  if (action.direction === "left") return <ArrowLeft size={16} aria-hidden="true" />;
  if (action.direction === "up") return <ArrowUp size={16} aria-hidden="true" />;
  if (action.direction === "down") return <ArrowDown size={16} aria-hidden="true" />;
  return <ArrowRight size={16} aria-hidden="true" />;
}

function MarkdownBlockView({ block }: { block: MarkdownBlock }) {
  if (block.kind === "heading") return <h3>{block.text}</h3>;
  if (block.kind === "subheading") return <h4>{block.text}</h4>;
  if (block.kind === "space") return <br aria-hidden="true" />;
  return <p>{block.text}</p>;
}

function MarkdownPage({ document, before = false, label }: { document: ReturnType<typeof getMarkdownFixture>; before?: boolean; label?: string }) {
  const lines = before ? document.before : document.after;
  const blocks = parseMarkdownLines(lines);
  return <section>
    <strong>{label ?? document.path}</strong>
    {blocks.map((block, index) => <MarkdownBlockView key={index} block={block} />)}
  </section>;
}

function fileTouchColor(state: SimulationState): string {
  if (state.phase === "complete") return "#3ddc84";
  if (state.tick >= 32) return "#ffa24c";
  return "#5aa9ff";
}

function GraphicPreview({ state, frame, geometry, dispatch }: { state: SimulationState; frame: DemoTerminalFrame; geometry: Geometry; dispatch: (action: DemoAction) => void }) {
  if (!frame.graphic || !frame.rectangle || frame.rectangle.height <= 0) return null;
  const rectangle = frame.rectangle;
  const attachment = frame.graphic === "attachment";
  const left = (rectangle.column - 1 + (attachment ? 1 : 0)) * geometry.width;
  const width = (rectangle.width - (attachment ? 2 : 0)) * geometry.width;
  const position = { top: (rectangle.row - 1) * geometry.height, left, width, height: rectangle.height * geometry.height };
  if (attachment) return <div className={`${styles.graphic} ${styles.attachment}`} style={position}><img src="/art/arcade-art.webp" alt="Attached sample: a hand-drawn arcade machine" /></div>;
  if (frame.graphic === "browser") return <div className={styles.graphic} style={position} aria-label="Local browser fixture"><div className={styles.browserPage}><h3>{state.browserUrl === "local://about" ? "About the example" : "Example project"}</h3><p>{state.browserUrl === "local://about" ? "A small project for this browser demonstration." : "Clear code. Thoughtful changes. A calmer workspace."}</p><button type="button" onClick={() => dispatch({ type: "browser-go", url: "local://example" })}>Home</button><button type="button" onClick={() => dispatch({ type: "browser-go", url: "local://about" })}>About</button>{state.browserGrab && <button className={styles.browserSelection} type="button" aria-label="Send selected page context to Claude" onClick={() => { dispatch({ type: "browser-grab" }); dispatch({ type: "fill-composer", text: browserContextPrompt(state.browserUrl) }); }} />}</div></div>;
  if (frame.graphic === "markdown") {
    const document = getMarkdownFixture(selectedMarkdownPath(state));
    const pair = state.panel.tab === "Pair" ? state.markdownPair : null;
    const compare = Boolean(pair) || state.panel.tab === "Before";
    return <div className={styles.graphic} style={position} aria-label="Markdown preview">
      <div className={`${styles.document} ${compare ? styles.documentCompare : ""}`}>
        {pair && <MarkdownPage document={getMarkdownFixture(pair[0])} before={markdownShowsBefore(state, pair[0])} />}
        {state.panel.tab === "Before" && <MarkdownPage document={document} before label="BEFORE" />}
        <MarkdownPage document={pair ? getMarkdownFixture(pair[1]) : document} before={markdownShowsBefore(state, pair ? pair[1] : document.path)} />
      </div>
    </div>;
  }
  if (frame.graphic === "files") return <div className={styles.graphic} style={position} aria-label="Local file relationship map"><svg className={styles.fileMap} viewBox="0 0 400 145" role="img" aria-label="src/app.ts imports styles.css; app tests cover the handler"><path d="M140 38H235M73 82V62" stroke="#5aa9ff" fill="none" /><path d="M228 33L236 38L228 43M68 68L73 60L78 68" stroke="#5aa9ff" fill="none" />{[{ x: 8, y: 18, label: "src/app.ts", tint: fileTouchColor(state) }, { x: 240, y: 18, label: "styles.css", tint: "#5aa9ff" }, { x: 8, y: 82, label: "app.test.ts", tint: "#ffa24c" }].map(file => <g key={file.label}><rect x={file.x} y={file.y} width="130" height="42" rx="4" fill="#151922" stroke={file.tint} /><text x={file.x + 10} y={file.y + 25} fill="#e8ebf2" fontFamily="Menlo,monospace" fontSize="12">{file.label}</text></g>)}</svg></div>;
  return null;
}

export function ModTerminalDemo({ id }: { id: DemoId }) {
  const definition = getDemoDefinition(id);
  const hostRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const sessionRef = useRef<ModTerminalSession | null>(null);
  const dispatchRef = useRef<(action: DemoAction) => void>(() => {});
  const stateRef = useRef(createSimulation(id));
  const reducedMotionRef = useRef(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState(() => createSimulation(id));
  const [frame, setFrame] = useState<DemoTerminalFrame | null>(null);
  const [geometry, setGeometry] = useState<Geometry>({ width: 7.8, height: 16.25 });
  const [composer, setComposer] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [copyNotice, setCopyNotice] = useState("");

  function fillComposer(text: string) { setComposer(text); sessionRef.current?.typing(Boolean(text)); composerRef.current?.focus(); }
  function dispatch(action: DemoAction) {
    if (action.type === "fill-composer") { fillComposer(action.text); return; }
    if (action.type === "queue-edit") {
      const text = stateRef.current.queue[action.index];
      if (!text) return;
      sessionRef.current?.dispatch(action); fillComposer(`/q ${text}`); return;
    }
    if (action.type === "copy") {
      let text = stateRef.current.transcript.findLast(entry => entry.role === "assistant")?.text ?? "The example change is ready.";
      if (action.format === "code") text = COPY_CODE;
      if (action.format === "markdown") text = COPY_TABLE;
      if (action.text !== undefined) text = action.text;
      copyDemoText(text).then(setCopyNotice);
      return;
    }
    sessionRef.current?.dispatch(action);
  }
  dispatchRef.current = dispatch;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    function updateMotionPreference() { reducedMotionRef.current = preference.matches; sessionRef.current?.render(); }
    updateMotionPreference();
    preference.addEventListener("change", updateMotionPreference);
    return () => preference.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (state.decision) cancelRef.current?.focus();
  }, [state.decision]);

  useEffect(() => {
    let cancelled = false;
    let terminal: Terminal | undefined;
    let session: ModTerminalSession | undefined;
    let observer: ResizeObserver | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let resizeFrame = 0;
    async function openTerminal() {
      try {
        const [{ Terminal }, { FitAddon }] = await Promise.all([import("@xterm/xterm"), import("@xterm/addon-fit")]);
        if (cancelled || !hostRef.current) return;
        terminal = new Terminal({ fontSize: 13, fontFamily: "Menlo, Monaco, Consolas, monospace", lineHeight: 1.25, theme: TERMINAL_THEME, scrollback: 0, cursorBlink: false, screenReaderMode: false });
        const fit = new FitAddon(); terminal.loadAddon(fit); terminal.open(hostRef.current); fit.fit();
        terminal.textarea?.setAttribute("aria-label", "Mod terminal controls. Escape returns to the message field.");
        session = createModTerminalSession(terminal, id, (nextState, nextFrame) => {
          if (cancelled) return;
          stateRef.current = nextState; setState(nextState); setFrame(nextFrame);
          const screen = hostRef.current?.querySelector(".xterm-screen");
          if (screen && terminal) { const bounds = screen.getBoundingClientRect(); setGeometry({ width: bounds.width / terminal.cols, height: bounds.height / terminal.rows }); }
        }, action => dispatchRef.current(action), () => composerRef.current?.focus(), () => reducedMotionRef.current);
        terminalRef.current = terminal; sessionRef.current = session;
        terminal.write("", () => { if (!cancelled) setReady(true); });
        timer = setInterval(() => { if (!document.hidden) session?.tick(); }, SIMULATION_TICK_MS);
        observer = new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { if (!cancelled) fit.fit(); }); });
        observer.observe(hostRef.current);
      } catch { if (!cancelled) setError(true); }
    }
    openTerminal();
    return () => { cancelled = true; if (timer) clearInterval(timer); cancelAnimationFrame(resizeFrame); observer?.disconnect(); session?.dispose(); terminal?.dispose(); terminalRef.current = null; sessionRef.current = null; };
  }, [id, attempt]);

  function send(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!composer.trim()) return; sessionRef.current?.submit(composer); setComposer(""); composerRef.current?.focus(); }
  const busy = state.phase === "working" || state.phase === "decision";
  const controls = getDemoControls(definition);
  const terminalActions = supplementalControls(id, frame, controls);
  return <section aria-label={`${id} interactive terminal demo`}>
    <div className={styles.terminal}>
      <div className={styles.canvas}>
        <div ref={hostRef} className={styles.host} />
        {ready && frame && <GraphicPreview state={state} frame={frame} geometry={geometry} dispatch={dispatch} />}
        {!ready && !error && <p className={styles.pinned} role="status">Loading terminal…</p>}
        {error && <p role="alert">The terminal couldn’t load. <button type="button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Try again</button></p>}
      </div>
      <form className={styles.composer} onSubmit={send}>
        <span aria-hidden="true">❯</span><label htmlFor="demo-message" className="sr-only">Message to simulated Claude</label>
        <input ref={composerRef} id="demo-message" value={composer} onChange={event => { setComposer(event.target.value); sessionRef.current?.typing(Boolean(event.target.value)); }} maxLength={MAX_PROMPT_LENGTH} placeholder={busy ? "Claude is working…" : "Message Claude…"} autoComplete="off" spellCheck={false} disabled={!ready} />
        <button type="submit" disabled={!ready || !composer.trim() || (busy && !composer.trim().startsWith("/"))}>Send</button>
      </form>
      {frame?.status && <p className={styles.pinned}>{stripAnsi(frame.status)}</p>}
    </div>
    {state.notice && <p className={styles.notice} role="status">{state.notice}</p>}
    {copyNotice && <p className={styles.notice} role="status">{copyNotice}</p>}
    {state.decision === "budget" && <div className={styles.controls} role="alertdialog" aria-label="Budget: send this prompt anyway?"><button type="button" onClick={() => dispatch({ type: "override" })}>Send anyway · one turn</button><button type="button" ref={cancelRef} onClick={() => dispatch({ type: "deny" })}>Do not send</button></div>}
    {state.decision === "command" && <div className={styles.controls} role="alertdialog" aria-label="Blast Radius held a command"><button type="button" ref={cancelRef} onClick={() => dispatch({ type: "deny" })}>Cancel command</button><button type="button" onClick={() => dispatch({ type: "proceed" })}>Proceed</button></div>}
    <div className={styles.controls} aria-label="Mod controls">
      {controls.map((control, index) => <button type="button" key={index} className={control.action.type === "arcade-move" ? styles.direction : undefined} aria-label={controlLabel(control.label)} onClick={() => dispatch(control.action)} disabled={!ready}><ControlContent action={control.action} label={control.label} /></button>)}

      <div className={styles.sessionControls}><button type="button" disabled={!ready || !busy} onClick={() => dispatch({ type: "stop" })}><Square size={13} aria-hidden="true" /> Stop</button><button type="button" disabled={!ready} onClick={() => { dispatch({ type: "reset" }); setComposer(""); setCopyNotice(""); }}><RotateCcw size={14} aria-hidden="true" /> Reset session</button></div>
    </div>
    {terminalActions.length > 0 && <details className={styles.extraControls}><summary>More terminal controls</summary><div className={styles.controls}>{terminalActions.map((control, index) => <button type="button" key={index} onClick={() => dispatch(control.action)}><ControlContent action={control.action} label={control.label} /></button>)}</div></details>}
    {id === "filetree" && <div className={styles.fields}><label>Find a file<input value={state.files.query} onChange={event => dispatch({ type: "file-search", text: event.target.value })} /></label></div>}
    {id === "pull-request-pane" && <form className={styles.fields} onSubmit={event => { event.preventDefault(); dispatch({ type: "review-add" }); }}><label>Review comment{state.panel.selection > 0 || state.review.quote ? " · selected passage" : ""}<input value={state.review.draft} onChange={event => dispatch({ type: "review-draft", text: event.target.value })} maxLength={MAX_PROMPT_LENGTH} placeholder="Write feedback, then add it" /></label><button type="submit">Add comment</button><button type="button" onClick={() => dispatch({ type: "review-submit" })}>Submit {state.review.comments.length} comments</button></form>}
    <div className="sr-only" role="log" aria-label="Simulated Claude conversation" aria-live="polite" aria-relevant="additions">{state.transcript.map(entry => <p key={entry.id ?? `${entry.turn}-${entry.role}-${entry.text}`}>{entry.role}: {entry.text}</p>)}</div>
    <pre className="sr-only" aria-label="Current mod output">{frame?.lines.map(stripAnsi).join("\n")}</pre>
    <p className="sr-only" role="status">{sessionStatusMessage(state)}</p>
    {id === "cc-arcade" && <div className="sr-only" role="grid" aria-label="2048 board">{[0,1,2,3].map(row => <div role="row" key={row}>{state.arcade.game.cells.slice(row * 4, row * 4 + 4).map((value, column) => <span role="gridcell" key={column}>{value || "Empty"}</span>)}</div>)}</div>}
  </section>;
}
