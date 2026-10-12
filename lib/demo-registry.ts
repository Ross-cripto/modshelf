import type { DemoId } from "./mod-demos.ts";
import type { DemoDefinition, DemoPanel, SimulationState } from "./demo-types.ts";
import { CORE_DEMOS, renderCoreDemo } from "./demo-views/core.ts";
import { HOOK_DEMOS, renderHooksDemo } from "./demo-views/hooks.ts";
import { PANE_DEMOS, renderPanesDemo } from "./demo-views/panes.ts";

export const DEMO_DEFINITIONS: DemoDefinition[] = [...CORE_DEMOS, ...HOOK_DEMOS, ...PANE_DEMOS];

export function getDemoDefinition(id: DemoId): DemoDefinition {
  const definition = DEMO_DEFINITIONS.find(demo => demo.id === id);
  if (!definition) throw new Error(`Missing demo definition: ${id}`);
  return definition;
}

export function renderDemoPanel(state: SimulationState, columns: number): DemoPanel {
  if (CORE_DEMOS.some(demo => demo.id === state.modId)) return renderCoreDemo(state, columns);
  if (HOOK_DEMOS.some(demo => demo.id === state.modId)) return renderHooksDemo(state, columns);
  return renderPanesDemo(state, columns);
}
