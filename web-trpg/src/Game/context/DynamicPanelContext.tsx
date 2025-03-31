import { createContext, ReactNode, useContext, useMemo, useState } from "react";

// TODO Add "status" to show own stats, actions, and equipment.
type DynamicPanelMode = "location" | "inventory";

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

export const WithDynamicPanel = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<DynamicPanelMode>("location");
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return (
    <DynamicPanelContext.Provider value={value}>
      {children}
    </DynamicPanelContext.Provider>
  );
};
