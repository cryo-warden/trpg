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

export type TargetContext = Context<{
  target: EntityId | null;
  setTarget: (entity: EntityId | null) => void;
}>;

export const TargetContext: TargetContext = createContext(null as any);

export const useTarget = () => useContext(TargetContext);

export const WithTarget = ({ children }: { children: ReactNode }) => {
  const controllerEntity = 1n; // WIP useControllerEntity()
  const [target, setTarget] = useState<EntityId | null>(null);
  useEffect(() => {
    if (
      true // WIP targetToken.value?.location !== controllerEntity
      // WIP && targetToken.value?.location !== controllerEntity.location
    ) {
      setTarget(null);
    }
  }, [target, controllerEntity]);
  const value = useMemo(() => ({ target, setTarget }), [target, setTarget]);
  return (
    <TargetContext.Provider value={value}>{children}</TargetContext.Provider>
  );
};
