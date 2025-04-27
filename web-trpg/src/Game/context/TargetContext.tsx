import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useControllerEntityToken } from "./ControllerContext";
import { Token, useToken } from "../../structural/mutable";
import { Entity } from "../entities";

export type TargetContext = Context<{
  targetToken: Token<Entity> | Token<null>;
  setTarget: (entity: Entity | null) => void;
}>;

export const TargetContext: TargetContext = createContext({
  targetToken: null,
  setTarget: () => {},
} as any);

export const useTarget = () => useContext(TargetContext);

export const WithTarget = ({ children }: { children: ReactNode }) => {
  const controllerEntityToken = useControllerEntityToken();
  const [target, setTarget] = useState<Entity | null>(null);
  const targetToken: Token<Entity> | Token<null> = useToken(target);
  useEffect(() => {
    if (
      targetToken.value?.location !== controllerEntityToken.value &&
      targetToken.value?.location !== controllerEntityToken.value?.location
    ) {
      setTarget(null);
    }
  }, [targetToken, controllerEntityToken]);
  const value = useMemo(
    () => ({ targetToken, setTarget }),
    [targetToken, setTarget]
  );
  return (
    <TargetContext.Provider value={value}>{children}</TargetContext.Provider>
  );
};
