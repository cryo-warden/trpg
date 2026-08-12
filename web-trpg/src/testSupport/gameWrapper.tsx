import type { ReactNode } from "react";
import type { Identity } from "spacetimedb";
import {
  DynamicPanelContext,
  type DynamicPanelMode,
} from "../Game/context/DynamicPanelContext";
import { FocusContext, type Focus } from "../Game/context/FocusContext";
import { FocusProvider } from "../Game/context/FocusProvider";
import { stdbWrapper } from "./mockConnection";

/**
 * A render wrapper composing the full client provider stack around a mock
 * connection: StdbContext (mock tables) -> DynamicPanel mode -> FocusProvider.
 * Panels that read game data and the focus cursor can render under this.
 */
export const gameWrapper = (
  tables: Record<string, unknown>,
  options: {
    identity?: Identity;
    mode?: DynamicPanelMode;
    setMode?: (mode: DynamicPanelMode) => void;
    reducers?: Record<string, unknown>;
    // When provided, inject this fixed focus instead of the co-location-aware
    // FocusProvider (handy for exercising focus-dependent branches).
    focus?: Focus;
    setFocus?: (focus: Focus) => void;
  } = {},
) => {
  const Stdb = stdbWrapper(tables, options.identity, options.reducers);
  const value = {
    mode: options.mode ?? "location",
    setMode: options.setMode ?? (() => {}),
  };
  const hasFixedFocus = "focus" in options;
  return function GameWrapper({ children }: { children: ReactNode }) {
    const focused = hasFixedFocus ? (
      <FocusContext.Provider
        value={{
          focus: options.focus ?? null,
          setFocus: options.setFocus ?? (() => {}),
        }}
      >
        {children}
      </FocusContext.Provider>
    ) : (
      <FocusProvider>{children}</FocusProvider>
    );
    return (
      <Stdb>
        <DynamicPanelContext.Provider value={value}>
          {focused}
        </DynamicPanelContext.Provider>
      </Stdb>
    );
  };
};
