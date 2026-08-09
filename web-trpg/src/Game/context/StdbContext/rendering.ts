import { ActionId } from "../../trpg";
import { useActionAsset } from "./assetLookup";

export const renderingQueries = ["select * from observable_events"];

export const useActionName = (actionId: ActionId) => {
  return useActionAsset(actionId)?.appearance.displayName ?? "Unknown Action";
};
