import type { EntityId, Entity } from "./types";
import { componentSerializer, createEntitySerializer } from "./serializer";
import { createEphemeralDictionary } from "./dictionary";
import {
  forEachEntity,
  forEachEntityCross,
  forEachEntityCrossDistinct,
  createSystemOf2Queries,
  createSystemOf2QueriesDistinct,
  createSystemOfQuery,
} from "./system";
import { createActionQueue } from "./actionQueue";
import { createLogger } from "./logger";
import { createSchedule } from "./schedule";

export {
  EntityId,
  Entity,
  componentSerializer,
  createActionQueue,
  createEntitySerializer,
  createEphemeralDictionary,
  createLogger,
  createSchedule,
  forEachEntity,
  forEachEntityCross,
  forEachEntityCrossDistinct,
  createSystemOfQuery,
  createSystemOf2Queries,
  createSystemOf2QueriesDistinct,
};
