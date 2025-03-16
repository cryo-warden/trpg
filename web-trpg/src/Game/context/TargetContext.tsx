import { Entity } from "action-trpg-lib";
import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

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
  const [target, setTarget] = useState<Entity | null>(null);
  const value = useMemo(() => ({ target, setTarget }), [target, setTarget]);
  return (
    <TargetContext.Provider value={value}>{children}</TargetContext.Provider>
  );
};
