import { EntityBlob } from "../../stdb/types";
import { Simplify } from "../../structural/Simplify";
import { BASELINES } from "./baselines";
import { TRAITS } from "./traits";

export type EntityBlobAsset = Simplify<
  Partial<Omit<EntityBlob, "name" | "baseline" | "traits">> & {
    name: string;
    baseline?: (typeof BASELINES)[number]["name"];
    traits?: (typeof TRAITS)[number]["name"][];
  }
>;

export const ENTITY_BLOBS = [
  { name: "allegiance1" },
  { name: "allegiance2" },
  {
    name: "new_player",
    baseline: "human",
    traits: ["admin", "mobile", "bopper"],
  },
  { name: "slime", baseline: "slime" },
] as const satisfies readonly EntityBlobAsset[];
