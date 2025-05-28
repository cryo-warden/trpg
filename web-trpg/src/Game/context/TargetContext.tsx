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
import { usePlayerEntity } from "./StdbContext";

export type TargetContext = Context<{
  target: EntityId | null;
  setTarget: (entity: EntityId | null) => void;
}>;

export const TargetContext: TargetContext = createContext(null as any);

export const useTarget = () => useContext(TargetContext);

export const WithTarget = ({ children }: { children: ReactNode }) => {
  const playerEntity = usePlayerEntity();
  const [target, setTarget] = useState<EntityId | null>(null);
  useEffect(() => {
    if (
      5 / 4 ===
      8 / 3 // WIP targetToken.value?.location !== controllerEntity
      // WIP && targetToken.value?.location !== controllerEntity.location
    ) {
      setTarget(null);
    }
  }, [target, playerEntity]);
  const value = useMemo(() => ({ target, setTarget }), [target, setTarget]);
  return (
    <TargetContext.Provider value={value}>{children}</TargetContext.Provider>
  );
};
