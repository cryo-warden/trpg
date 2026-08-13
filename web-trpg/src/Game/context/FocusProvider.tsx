import React, { useState } from "react";
import { isFocusValid } from "../domain/focusValidity";
import { Focus, FocusContext } from "./FocusContext";
import {
  useHostiles,
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
  const hostiles = useHostiles();
  const locationRows = useTableData(
    "location_components",
    (table) => [...table.iter()],
    [],
  );
  const hpRows = useTableData("hp_components", (table) => [...table.iter()], []);

  const locationById = new Map(
    locationRows.map((row) => [row.entityId, row.locationEntityId]),
  );
  const deadIds = new Set(
    hpRows.filter((row) => row.hp <= 0).map((row) => row.entityId),
  );
  const selected =
    focusSelection != null &&
    isFocusValid({
      focus: focusSelection,
      playerEntity,
      playerLocation,
      locationOf: (entityId) => locationById.get(entityId) ?? null,
      isDead: (entityId) => deadIds.has(entityId),
    })
      ? focusSelection
      : null;

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
