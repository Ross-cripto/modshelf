import type { Terminal } from "@xterm/xterm";
import type { DemoId } from "./mod-demos.ts";
import type { DemoAction, SimulationState } from "./demo-types.ts";
import { appendEntry, applyDemoAction, createSimulation, submitPrompt, tickSimulation } from "./mod-simulation.ts";
import { buildDemoTerminalFrame, findDemoAction, paintDemoTerminalFrame, type DemoTerminalFrame } from "./demo-terminal-frame.ts";
import { getDemoKeyAction } from "./demo-keyboard.ts";
import { getDemoDefinition } from "./demo-registry.ts";
import { parseTerminalMouse } from "./arcade-terminal.ts";

export type ModTerminalSession = {
  dispatch: (action: DemoAction) => void;
  submit: (text: string) => void;
  tick: () => void;
  typing: (hasText: boolean) => void;
  render: () => void;
  dispose: () => void;
};

export function createModTerminalSession(terminal: Terminal, id: DemoId, onChange: (state: SimulationState, frame: DemoTerminalFrame) => void, onAction: (action: DemoAction) => void, focusComposer: () => void, reducedMotion: () => boolean = () => false): ModTerminalSession {
  let state = createSimulation(id);
  const startupCommand = getDemoDefinition(id).startupCommand;
  if (startupCommand) state = appendEntry(state, "system", `${startupCommand} · opened for this demo`);
  let frame: DemoTerminalFrame | undefined;
  function render() {
    const nextFrame = buildDemoTerminalFrame(state, terminal.cols, terminal.rows, reducedMotion());
    terminal.write(paintDemoTerminalFrame(nextFrame, frame));
    frame = nextFrame;
    onChange(state, nextFrame);
  }
  function dispatch(action: DemoAction) { state = applyDemoAction(state, action); render(); }
  function submit(text: string) { state = submitPrompt(state, text); render(); }
  function tick() { state = tickSimulation(state); render(); }
  function typing(hasText: boolean) {
    if (state.composerTyping === hasText) return;
    state = { ...state, composerTyping: hasText }; render();
  }
  function handleKey(event: KeyboardEvent): boolean {
    if (event.type !== "keydown") return true;
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    if (event.key === "Tab") return false;
    if (event.key === "Escape") { event.preventDefault(); focusComposer(); return false; }
    const action = frame ? getDemoKeyAction(event.key, state, frame) : null;
    if (action) { event.preventDefault(); onAction(action); return false; }
    if (event.key === "Enter") { event.preventDefault(); focusComposer(); }
    return false;
  }
  terminal.attachCustomKeyEventHandler(handleKey);
  terminal.attachCustomWheelEventHandler(() => false);
  const dataListener = terminal.onData(input => {
    const mouse = parseTerminalMouse(input);
    if (!mouse || !frame) return;
    const action = findDemoAction(frame, mouse.column, mouse.row);
    if (action) onAction(action);
    else if (id === "cc-dino") dispatch({ type: "dino-jump" });
  });
  const resizeListener = terminal.onResize(() => { frame = undefined; render(); });
  render();
  return { dispatch, submit, tick, typing, render, dispose() { dataListener.dispose(); resizeListener.dispose(); } };
}
