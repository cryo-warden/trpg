import React, { useState } from "react";
import { Target, TargetContext } from "./TargetContext";
import { usePlayerEntity, useLocation } from "./StdbContext/components";

export const TargetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [targetSelection, setTargetSelection] = useState<Target>(null);

  const playerEntity = usePlayerEntity();
  const playerLocation = useLocation(playerEntity);
  const targetLocation = useLocation(targetSelection);

  const target =
    playerLocation && targetLocation && playerLocation !== targetLocation
      ? null
      : targetSelection;

  return (
    <TargetContext.Provider value={{ target, setTarget: setTargetSelection }}>
      {children}
    </TargetContext.Provider>
  );
};
