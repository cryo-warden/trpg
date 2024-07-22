import { IWorld, Query, System } from "bitecs";
import { EntityId } from "./types";

export type ResourceSystem<R = {}, T extends IWorld = IWorld> = (
  resource: R
) => System<[], T>;

type ActionResourceSystemSpec<R, T extends IWorld> = {
  query: Query<T>;
  action: (resource: R) => (id: EntityId, value: T) => void;
};

type CrossActionResourceSystemSpec<R, T extends IWorld> = {
  distinct?: boolean;
  queries: [Query<T>, Query<T>];
  crossAction: (
    resource: R
  ) => (lhsId: EntityId, rhsId: EntityId, value: T) => void;
};

export type ResourceSystemSpec<R = {}, T extends IWorld = IWorld> =
  | { system: ResourceSystem<R, T> }
  | ActionResourceSystemSpec<R, T>
  | CrossActionResourceSystemSpec<R, T>
  | readonly ResourceSystemSpec<R, T>[];

const createResourceSystemOfQuery: <R, T extends IWorld>(
  spec: ActionResourceSystemSpec<R, T>
) => ResourceSystem<R, T> =
  ({ query, action }) =>
  (resource) => {
    const resourcedAction = action(resource);

    return (value) => {
      const ids = query(value) as EntityId[];
      for (let i = 0; i < ids.length; ++i) {
        resourcedAction(ids[i], value);
      }
      return value;
    };
  };

const createResourceSystemOf2Queries: <R, T extends IWorld>(
  spec: CrossActionResourceSystemSpec<R, T>
) => ResourceSystem<R, T> =
  ({ distinct, queries: [lhsQuery, rhsQuery], crossAction }) =>
  (resource) => {
    const resourceCrossAction = crossAction(resource);

    // We duplicate this code to avoid repeated checks of the distinct flag on every pair iteration.
    if (distinct) {
      return (value) => {
        const lhsIds = lhsQuery(value) as EntityId[];
        const rhsIds = rhsQuery(value) as EntityId[];
        for (let i = 0; i < lhsIds.length; ++i) {
          for (let j = 0; j < rhsIds.length; ++j) {
            if (lhsIds[i] !== rhsIds[j]) {
              resourceCrossAction(lhsIds[i], rhsIds[j], value);
            }
          }
        }
        return value;
      };
    }

    return (value) => {
      const lhsIds = lhsQuery(value) as EntityId[];
      const rhsIds = rhsQuery(value) as EntityId[];
      for (let i = 0; i < lhsIds.length; ++i) {
        for (let j = 0; j < rhsIds.length; ++j) {
          resourceCrossAction(lhsIds[i], rhsIds[j], value);
        }
      }
      return value;
    };
  };

const createResourceSystemOfPipeline: <R, T extends IWorld>(
  specs: readonly ResourceSystemSpec<R, T>[]
) => ResourceSystem<R, T> = (specs) => {
  const systems = specs.map(internalCreateResourceSystem);
  return (resource) => {
    const resourcedSystems = systems.map((system) => system(resource));
    return (value) => {
      let result = value;
      for (let i = 0; i < resourcedSystems.length; ++i) {
        result = resourcedSystems[i](result);
      }
      return result;
    };
  };
};

/**
 * Create a ResourceSystem, a function which takes a specific type as a
 * resource and returns a bitecs System.
 */
export const createResourceSystem: <
  S extends ResourceSystemSpec<any, T>,
  T extends IWorld
>(
  s: S
) => ResourceSystem<S extends ResourceSystemSpec<infer R, T> ? R : never, T> = (
  spec
) => {
  if ("query" in spec) {
    return createResourceSystemOfQuery(spec);
  }

  if ("queries" in spec) {
    return createResourceSystemOf2Queries(spec);
  }

  if ("system" in spec) {
    return spec.system;
  }

  if (Array.isArray(spec)) {
    return createResourceSystemOfPipeline(spec);
  }

  throw new Error("`createResourceSystem` received an invalid spec.", {
    cause: spec,
  });
};

// NOTE: Why are there two different types for CreateResourceSystem?
// There seems to be a TypeScript inference limitation.
// We want users to be able to specify an array argument where we can
// infer the resource type R as the intersection of all elements'
// resource types.
// However, we need a separate internal type to gracefully handle recursion.
// The extra inferential power seems to break the recursive case.

const internalCreateResourceSystem: <R, T extends IWorld = IWorld>(
  spec: ResourceSystemSpec<R, T>
) => ResourceSystem<R, T> = createResourceSystem;
