import React, { useState } from "react";
import { isFocusValid } from "../domain/focusValidity";
import { Focus, FocusContext } from "./FocusContext";
import {
  useActiveHostiles,
  useLocation,
  usePlayerEntity,
} from "./StdbContext/components";
import { useTableData } from "./StdbContext/useTableData";

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [focusSelection, setFocusSelection] = useState<Focus>(null);

  const playerEntity = usePlayerEntity();
  const playerLocation = useLocation(playerEntity);
  const activeHostiles = useActiveHostiles();
  const locationRows = useTableData(
    "location_components",
    (table) => [...table.iter()],
    [],
  );

  const locationById = new Map(
    locationRows.map((row) => [row.entityId, row.locationEntityId]),
  );
  const selected =
    focusSelection != null &&
    isFocusValid({
      focus: focusSelection,
      playerEntity,
      playerLocation,
      locationOf: (entityId) => locationById.get(entityId) ?? null,
    })
      ? focusSelection
      : null;

  // The obvious fight demands no aiming: with exactly one LIVING hostile
  // and nothing explicitly focused, attention rests on it, so its
  // (hotkeyed) actions are one input away. The fallen never auto-take the
  // focus. An explicit focus always wins; this is pure derivation, never
  // stored.
  const focus =
    selected == null && activeHostiles.length === 1
      ? activeHostiles[0]
      : selected;

  return (
    <FocusContext.Provider value={{ focus, setFocus: setFocusSelection }}>
      {children}
    </FocusContext.Provider>
  );
};
