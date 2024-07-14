import { mergeFactoryRecords } from "../../src";
import { ActivityQueue } from "./ActivityQueue";
import { Player } from "./Player";
import { Position } from "./Position";
import { RandomFlier } from "./RandomFlier";

export const createComponentRecord = mergeFactoryRecords({
  ActivityQueue,
  Player,
  Position,
  RandomFlier,
});

export type ComponentRecord = ReturnType<typeof createComponentRecord>;
