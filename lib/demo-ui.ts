import { browserContextPrompt, getFixtureFilePath } from "./demo-fixtures.ts";
import type { DemoAction, DemoButton, DemoDefinition, SimulationState } from "./demo-types.ts";
import type { DemoTerminalFrame } from "./demo-terminal-frame.ts";
import type { DemoId } from "./mod-demos.ts";

function actionsMatch(first: DemoAction, second: DemoAction): boolean {
  if (first.type !== second.type) return false;
  if ("index" in first && "index" in second) return first.index === second.index;
  if ("value" in first && "value" in second) return first.value === second.value;
  if ("format" in first && "format" in second) return first.format === second.format;
  if ("direction" in first && "direction" in second) return first.direction === second.direction;
  if ("delta" in first && "delta" in second) return first.delta === second.delta;
  if ("text" in first && "text" in second) return first.text === second.text;
  return true;
}

function selectionLabel(id: DemoId, index: number): string {
  if (id === "cctop") {
    const metrics = ["Context window", "Five-hour limit", "Cache", "Spend", "Check / rework", "Calls / errors"];
    return `Inspect ${metrics[index] ?? "metric"}`;
  }
  if (id === "flowpane") return `Inspect workflow agent ${index + 1}`;
  if (id === "filetree") {
    return `Select ${getFixtureFilePath(index) ?? "file"}`;
  }
  if (id === "pull-request-pane") return `Quote passage ${index}`;
  if (id === "prompt-rail") return `Jump to prompt ${index + 1}`;
  return `Inspect item ${index + 1}`;
}

function actionLabel(id: DemoId, action: DemoAction): string {
  switch (action.type) {
    case "close": return "Close mod pane";
    case "open": return "Open mod pane";
    case "select": return selectionLabel(id, action.index);
    case "tab":
      if (id === "pull-request-pane") return action.value === "checks" ? "Expand PR checks" : "Collapse PR checks";
      return action.value;
    case "review-remove": return `Remove comment ${action.index + 1}`;
    case "queue-up": return `Move queued message ${action.index + 1} up`;
    case "queue-down": return `Move queued message ${action.index + 1} down`;
    case "queue-now": return `Send or steer queued message ${action.index + 1}`;
    case "queue-edit": return `Edit queued message ${action.index + 1}`;
    case "queue-remove": return `Remove queued message ${action.index + 1}`;
    case "proceed": return "Proceed with held command";
    case "deny": return "Cancel held request";
    case "copy": return `Copy ${action.format}`;
    case "override": return "Send anyway for one turn";
    case "review-add": return "Add comment";
    case "review-submit": return "Submit comments to simulated Claude";
    case "fill-composer": return "Put context in the message field";
    default: return "Use terminal action";
  }
}

export function supplementalControls(id: DemoId, frame: DemoTerminalFrame | null, existing: DemoButton[]): DemoButton[] {
  if (!frame) return [];
  const controls: DemoButton[] = [];
  for (const target of frame.targets) {
    if (existing.some(button => actionsMatch(button.action, target.action))) continue;
    if (controls.some(button => actionsMatch(button.action, target.action))) continue;
    controls.push({ label: actionLabel(id, target.action), action: target.action });
  }
  return controls;
}

export function sessionStatusMessage(state: SimulationState): string {
  if (state.phase === "working") return "Claude is working on your message.";
  if (state.phase === "complete") return "Claude replied. You can send another message.";
  if (state.phase === "decision") return "Choose how to continue the held request.";
  if (state.phase === "stopped") return "Claude stopped. You can send another message.";
  return "Ready for a message.";
}

export async function copyDemoText(text: string): Promise<string> {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    return "Copied to clipboard.";
  } catch {
    return "Clipboard unavailable. Select the text in the terminal to copy it.";
  }
}

export function getDemoControls(definition: DemoDefinition, state: SimulationState): DemoButton[] {
  if (state.modId !== "terminal-browser") return definition.controls;
  const controls: DemoButton[] = [];
  for (const button of definition.controls) {
    if (button.action.type === "fill-composer") {
      controls.push({ ...button, action: { type: "fill-composer", text: browserContextPrompt(state.browserUrl) } });
    } else {
      controls.push(button);
    }
  }
  return controls;
}
