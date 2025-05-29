import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { EntityId } from "../trpg";
import { useLocation, usePlayerEntity } from "./StdbContext";

export type TargetContext = Context<{
  target: EntityId | null;
  setTarget: (entity: EntityId | null) => void;
}>;

export const TargetContext: TargetContext = createContext(null as any);

export const useTarget = () => useContext(TargetContext);

export const WithTarget = ({ children }: { children: ReactNode }) => {
  const playerEntity = usePlayerEntity();
  const playerLocation = useLocation(playerEntity);
  const [target, setTarget] = useState<EntityId | null>(null);
  const targetLocation = useLocation(target);
  useEffect(() => {
    if (targetLocation !== playerEntity && targetLocation !== playerLocation) {
      setTarget(null);
    }
  }, [playerEntity, playerLocation, setTarget, targetLocation]);
  const value = useMemo(() => ({ target, setTarget }), [target, setTarget]);
  return (
    <TargetContext.Provider value={value}>{children}</TargetContext.Provider>
  );
};
