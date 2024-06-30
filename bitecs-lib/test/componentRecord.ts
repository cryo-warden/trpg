import { asComponentRecord } from "../src";
import { Player, Position, RandomFlier } from "./schema";

export const componentRecord = asComponentRecord({
  Player,
  Position,
  RandomFlier,
} as const);
