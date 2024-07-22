import { mergeFactoryRecords } from "bitecs-helpers";
import { Actor } from "./Actor";
import { Damage } from "./Damage";
import { Death } from "./Death";
import { Life } from "./Life";
import { Observable } from "./Observable";
import { Observer } from "./Observer";
import { Position } from "./Position";
import { Velocity } from "./Velocity";

export const createComponentRecord = mergeFactoryRecords({
  Actor,
  Damage,
  Death,
  Life,
  Observable,
  Observer,
  Position,
  Velocity,
});

export type ComponentRecord = ReturnType<typeof createComponentRecord>;
