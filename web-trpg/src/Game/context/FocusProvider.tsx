import React, { useState } from "react";
import { Focus, FocusContext } from "./FocusContext";
import {
  useHostiles,
  useLocation,
  usePlayerEntity,
} from "./StdbContext/components";

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [focusSelection, setFocusSelection] = useState<Focus>(null);

  const playerEntity = usePlayerEntity();
  const playerLocation = useLocation(playerEntity);
  const focusLocation = useLocation(focusSelection);
  const hostiles = useHostiles();

  const selected =
    playerLocation && focusLocation && playerLocation !== focusLocation
      ? null
      : focusSelection;

  // The obvious fight demands no aiming: with exactly one hostile and nothing
  // explicitly focused, attention rests on it, so its (hotkeyed) actions are
  // one input away. An explicit focus always wins; this is pure derivation,
  // never stored.
  const focus =
    selected == null && hostiles.length === 1 ? hostiles[0] : selected;

  return (
    <FocusContext.Provider value={{ focus, setFocus: setFocusSelection }}>
      {children}
    </FocusContext.Provider>
  );
};
