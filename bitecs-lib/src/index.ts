import { type System, defineQuery } from "bitecs";
import { Types } from "./types";
import { asComponent, asComponentRecord } from "./component";
import { type EntityId } from "./entity";
import { createEngine } from "./engine";
import { createEphemeralDictionary } from "./dictionary";

export {
  System,
  EntityId,
  Types,
  createEngine,
  defineQuery,
  asComponent,
  asComponentRecord,
  createEphemeralDictionary,
};
