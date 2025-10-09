import { createContext, useContext } from "react";
import { EntityId } from "../trpg";

export type Target = EntityId | null;

export interface TargetContextValue {
  target: Target;
  setTarget: (target: Target) => void;
}

export const TargetContext = createContext<TargetContextValue | null>(null);

export const useTargetContext = () => {
  const ctx = useContext(TargetContext);
  if (!ctx) {
    throw new Error("useTargetContext must be used within a TargetProvider");
  }
  return ctx;
};

export const useTarget = () => {
  const { target } = useTargetContext();
  return target;
};

export const useSetTarget = () => {
  const { setTarget } = useTargetContext();
  return setTarget;
};
