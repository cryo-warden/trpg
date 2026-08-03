import type { ReactNode } from "react";
import type { Identity } from "spacetimedb";
import {
  DynamicPanelContext,
  type DynamicPanelMode,
} from "../Game/context/DynamicPanelContext";
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
  } = {},
) => {
  const Stdb = stdbWrapper(tables, options.identity, options.reducers);
  const value = {
    mode: options.mode ?? "location",
    setMode: options.setMode ?? (() => {}),
  };
  return function GameWrapper({ children }: { children: ReactNode }) {
    return (
      <Stdb>
        <DynamicPanelContext.Provider value={value}>
          <TargetProvider>{children}</TargetProvider>
        </DynamicPanelContext.Provider>
      </Stdb>
    );
  };
};
