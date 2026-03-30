import { actions } from ".";
import { EntityBlob } from "../../stdb/types";
import { Simplify } from "../../structural/Simplify";
import { BASELINES } from "./baselines";
import { TRAITS } from "./traits";

export type ActionHotkeyAsset = {
  actionName: (typeof actions)[number]["name"];
  hotkey: string;
};

export type EntityBlobAsset = Simplify<
  Partial<
    Omit<EntityBlob, "name" | "baseline" | "traits" | "actionHotkeys">
  > & {
    name?: string;
    baseline?: (typeof BASELINES)[number]["name"];
    traits?: (typeof TRAITS)[number]["name"][];
    actionHotkeys?: ActionHotkeyAsset[];
  }
>;

export const ENTITY_BLOBS = [
  { name: "allegiance1" },
  { name: "allegiance2" },
  { name: "room1" },
  { name: "room2" },
  { baseline: "slime" },
  { baseline: "slime" },
  { baseline: "slime" },
  { baseline: "slime", traits: ["small"] },
  { baseline: "slime", traits: ["big"] },
] as const satisfies readonly EntityBlobAsset[];

export const NEW_PLAYER_BLOB = {
  actionHotkeys: [
    { actionName: "boppity_bop", hotkey: "v" },
    { actionName: "quick_move", hotkey: "m" },
    { actionName: "divine_heal", hotkey: "h" },
  ],
  baseline: "human",
  traits: ["admin", "mobile", "bopper"],
} as const satisfies EntityBlobAsset;
