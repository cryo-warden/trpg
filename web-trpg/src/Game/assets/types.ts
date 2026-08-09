import { StatBlock } from "../../stdb/types";
import { Simplify } from "../../structural/Simplify";
import { ActionName } from "./actions";
import { AppearanceFeatureName } from "./appearance_features";

export type StatBlockAsset = Simplify<
  {
    appearanceFeatureNames?: AppearanceFeatureName[];
    actionNames?: ActionName[];
  } & Partial<Omit<StatBlock, "actionIds" | "appearanceFeatureIds">>
>;
