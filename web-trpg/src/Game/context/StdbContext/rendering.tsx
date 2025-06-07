import { useMemo } from "react";
import { EntityEvent } from "../../../stdb";
import { ActionId, EntityId } from "../../trpg";
import { useObserverComponentsObservableEventIds } from "./components";
import { useTable } from "./useTable";
import { useTableData } from "./useTableData";

export const renderingQueries = [
  "select * from action_appearances",
  "select * from appearance_features",
  "select * from observable_events",
];

export const useActionAppearances = useTable("actionAppearances");
export const useActionName = (actionId: ActionId) => {
  return useTableData(
    "actionAppearances",
    (table) => table.actionId.find(actionId)?.name ?? null,
    [actionId]
  );
};
export const useAppearanceFeatures = useTable("appearanceFeatures");
const useObservableEvents = useTable("observableEvents");

export const useObserverComponentsEvents = (
  entityId: EntityId | null
): EntityEvent[] => {
  const eventIds = useObserverComponentsObservableEventIds(entityId);
  const observableEvents = useObservableEvents();
  const events = useMemo(() => {
    const idToObservableEvent = new Map(observableEvents.map((e) => [e.id, e]));
    return eventIds
      .map((id) => idToObservableEvent.get(id))
      .filter((e) => e != null);
  }, [eventIds, observableEvents]);
  return events;
};
