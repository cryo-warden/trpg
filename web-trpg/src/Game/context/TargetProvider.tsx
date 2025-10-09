import React, { useState, useEffect } from "react";
import { Target, TargetContext } from "./TargetContext";
import { usePlayerEntity, useLocation } from "./StdbContext/components";

export const TargetProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [target, setTarget] = useState<Target>(null);

  const playerEntity = usePlayerEntity();
  const playerLocation = useLocation(playerEntity);
  const targetLocation = useLocation(target);

  useEffect(() => {
    if (target == null || playerEntity === target) return;
    if (playerLocation && targetLocation && playerLocation !== targetLocation) {
      setTarget(null);
    }
  }, [playerEntity, target, playerLocation, targetLocation]);

  return (
    <TargetContext.Provider value={{ target, setTarget }}>
      {children}
    </TargetContext.Provider>
  );
};
