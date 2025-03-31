import { Entity } from "action-trpg-lib";
import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useControllerEntity } from "./ControllerContext";
import { useWatchable } from "../../structural/useWatchable";

export type TargetContext = Context<{
  target: Entity | null;
  setTarget: (entity: Entity | null) => void;
}>;

export const TargetContext: TargetContext = createContext({
  target: null,
  setTarget: () => {},
} as any);

export const useTarget = () => useContext(TargetContext);

export const WithTarget = ({ children }: { children: ReactNode }) => {
  const controllerEntity = useControllerEntity();
  const [target, setTarget] = useState<Entity | null>(null);
  useWatchable(controllerEntity);
  useWatchable(target);
  useEffect(() => {
    if (
      target?.location !== controllerEntity &&
      target?.location !== controllerEntity?.location
    ) {
      setTarget(null);
    }
  }, [target?.location, controllerEntity?.location]);
  const value = useMemo(() => ({ target, setTarget }), [target, setTarget]);
  return (
    <TargetContext.Provider value={value}>{children}</TargetContext.Provider>
  );
};
