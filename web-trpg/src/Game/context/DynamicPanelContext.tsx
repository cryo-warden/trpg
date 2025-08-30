import { createContext, useContext } from "react";

// TODO Add "actions" to show own actions and set their hotkeys.
export type DynamicPanelMode = "location" | "inventory" | "equipment" | "stats";

export const DynamicPanelContext = createContext<{
  mode: DynamicPanelMode;
  setMode: (newMode: DynamicPanelMode) => void;
}>({
  mode: "location",
  setMode: () => {},
});

export type DynamicPanelContext = typeof DynamicPanelContext;

export const useDynamicPanelMode = () => {
  const { mode } = useContext(DynamicPanelContext);
  return mode;
};

export const useSetDynamicPanelMode = () => {
  const { setMode } = useContext(DynamicPanelContext);
  return setMode;
};
