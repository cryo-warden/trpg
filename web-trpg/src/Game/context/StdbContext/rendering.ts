import { ACTION_APPEARANCES } from "../../assets/actions";
import { ActionId } from "../../trpg";
import { useActionAsset } from "./assetLookup";

export const renderingQueries = ["select * from observable_events"];

export const useActionName = (actionId: ActionId) => {
  const name = useActionAsset(actionId)?.name;
  return name == null ? "Unknown Action" : ACTION_APPEARANCES[name].displayName;
};
