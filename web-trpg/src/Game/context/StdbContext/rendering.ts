import { ActionId } from "../../trpg";
import { createUseTable } from "./useTable";
import { useTableData } from "./useTableData";

export const renderingQueries = [
  "select * from action_appearances",
  "select * from appearance_features",
  "select * from observable_events",
];

export const useActionAppearances = createUseTable("actionAppearances");
export const useActionName = (actionId: ActionId) => {
  return useTableData(
    "actionAppearances",
    (table) => table.actionId.find(actionId)?.name ?? null,
    [actionId]
  );
};
export const useAppearanceFeatures = createUseTable("appearanceFeatures");
