import { asComponentRecord } from "../src";
import { ActivityQueue, Player, Position, RandomFlier } from "./schema";

export const componentRecord = asComponentRecord({
  Player,
  Position,
  RandomFlier,
  ActivityQueue,
} as const);
