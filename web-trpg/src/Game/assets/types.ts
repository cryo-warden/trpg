import { StatBlock } from "../../stdb/types";
import { Simplify } from "../../structural/Simplify";
import { ACTIONS } from "./actions";
import { APPEARANCE_FEATURES } from "./appearance_features";

export type StatBlockAsset = Simplify<
  {
    name: string;
    appearanceFeatureNames?: (typeof APPEARANCE_FEATURES)[number]["name"][];
    actionNames?: (typeof ACTIONS)[number]["name"][];
  } & Partial<Omit<StatBlock, "actionIds" | "appearanceFeatureIds">>
>;
