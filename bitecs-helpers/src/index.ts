import type { EntityId, Entity } from "./types";
import { componentSerializer, createEntitySerializer } from "./serializer";
import { createEphemeralDictionary } from "./dictionary";
import {
  type ResourceSystem,
  type ResourceSystemSpec,
  createResourceSystem,
} from "./system";
import { createActionQueue } from "./actionQueue";
import { createLogger } from "./logger";
import { createPipeline } from "./pipeline";

export {
  EntityId,
  Entity,
  ResourceSystem,
  ResourceSystemSpec,
  componentSerializer,
  createActionQueue,
  createEntitySerializer,
  createEphemeralDictionary,
  createLogger,
  createPipeline,
  createResourceSystem,
};
