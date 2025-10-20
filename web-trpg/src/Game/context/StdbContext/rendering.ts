import { actions } from "../../assets";
import { ActionId } from "../../trpg";

export const renderingQueries = ["select * from observable_events"];

export const useActionName = (actionId: ActionId) => {
  return actions[actionId]?.appearance.displayName ?? "Unknown Action";
};
