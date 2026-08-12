import { createContext, useContext } from "react";
import { EntityId } from "../trpg";

/**
 * Focus is the player's inspection cursor: the entity whose details the UI
 * examines. It never fires anything by itself — actions bind TARGETS, and a
 * single-target action defaults its target to the focus (see ActionButton).
 */
export type Focus = EntityId | null;

export interface FocusContextValue {
  focus: Focus;
  setFocus: (focus: Focus) => void;
}

export const FocusContext = createContext<FocusContextValue | null>(null);

export const useFocusContext = () => {
  const ctx = useContext(FocusContext);
  if (!ctx) {
    throw new Error("useFocusContext must be used within a FocusProvider");
  }
  return ctx;
};

export const useFocus = () => {
  const { focus } = useFocusContext();
  return focus;
};

export const useSetFocus = () => {
  const { setFocus } = useFocusContext();
  return setFocus;
};
