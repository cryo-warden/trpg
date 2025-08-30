import { ReactNode, useState, useMemo } from "react";
import { DynamicPanelMode, DynamicPanelContext } from "./DynamicPanelContext";

export const WithDynamicPanel = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<DynamicPanelMode>("location");
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return (
    <DynamicPanelContext.Provider value={value}>
      {children}
    </DynamicPanelContext.Provider>
  );
};
