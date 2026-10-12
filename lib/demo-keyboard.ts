import type { DemoAction, SimulationState } from "./demo-types.ts";
import type { DemoTerminalFrame } from "./demo-terminal-frame.ts";
import { getKeyDirection } from "./arcade-demo.ts";

export function getDemoKeyAction(key: string, state: SimulationState, frame: DemoTerminalFrame): DemoAction | null {
  if (state.panel.open && state.modId === "cc-arcade") {
    const direction = getKeyDirection(key);
    if (direction) return { type: "arcade-move", direction };
    if (key.toLowerCase() === "r") return { type: "game-restart" };
  }
  if (state.panel.open && state.modId === "cc-dino") {
    if ([" ", "ArrowUp", "w", "W", "Enter"].includes(key)) return { type: "dino-jump" };
    if (["ArrowDown", "s", "S"].includes(key)) return { type: "dino-duck" };
    if (key.toLowerCase() === "p") return { type: "pause" };
    if (key.toLowerCase() === "r") return { type: "game-restart" };
  }
  const shortcut = frame.targets.find(target => target.key === key.toLowerCase());
  if (shortcut) return shortcut.action;
  return null;
}
