import { defineQuery, type System } from "bitecs";
import { Types } from "./types";
import type { EntityId } from "./entity";
import { asComponent, asComponentRecord } from "./component";
import { create as createWorld } from "./world";

export { Types, EntityId, asComponent, asComponentRecord, createWorld };

export { System, defineQuery };
