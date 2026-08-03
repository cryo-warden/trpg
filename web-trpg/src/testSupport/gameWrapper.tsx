import type { ReactNode } from "react";
import type { Identity } from "spacetimedb";
import {
  DynamicPanelContext,
  type DynamicPanelMode,
} from "../Game/context/DynamicPanelContext";
import {
  TargetContext,
  type Target,
} from "../Game/context/TargetContext";
import { TargetProvider } from "../Game/context/TargetProvider";
import { stdbWrapper } from "./mockConnection";

/**
 * A render wrapper composing the full client provider stack around a mock
 * connection: StdbContext (mock tables) -> DynamicPanel mode -> TargetProvider.
 * Panels that read game data and selection/target state can render under this.
 */
export const gameWrapper = (
  tables: Record<string, unknown>,
  options: {
    identity?: Identity;
    mode?: DynamicPanelMode;
    setMode?: (mode: DynamicPanelMode) => void;
    reducers?: Record<string, unknown>;
    // When provided, inject this fixed target instead of the co-location-aware
    // TargetProvider (handy for exercising target-dependent branches).
    target?: Target;
    setTarget?: (target: Target) => void;
  } = {},
) => {
  const Stdb = stdbWrapper(tables, options.identity, options.reducers);
  const value = {
    mode: options.mode ?? "location",
    setMode: options.setMode ?? (() => {}),
  };
  const hasFixedTarget = "target" in options;
  return function GameWrapper({ children }: { children: ReactNode }) {
    const targeted = hasFixedTarget ? (
      <TargetContext.Provider
        value={{
          target: options.target ?? null,
          setTarget: options.setTarget ?? (() => {}),
        }}
      >
        {children}
      </TargetContext.Provider>
    ) : (
      <TargetProvider>{children}</TargetProvider>
    );
    return (
      <Stdb>
        <DynamicPanelContext.Provider value={value}>
          {targeted}
        </DynamicPanelContext.Provider>
      </Stdb>
    );
  };
};
