import { IWorld, Query, System } from "bitecs";
import { EntityId } from "./types";

type Action<TArgs extends any[]> = (id: EntityId, ...args: TArgs) => void;

type CrossAction<TArgs extends any[]> = (
  lhsId: EntityId,
  rhsId: EntityId,
  ...args: TArgs
) => void;

type CreateSystemOfQuery = <TArgs extends any[], T extends IWorld>(
  query: Query,
  f: Action<TArgs>
) => System<TArgs, T>;

type CreateSystemOf2Queries = <TArgs extends any[], T extends IWorld>(
  lhsQuery: Query,
  rhsQuery: Query,
  f: CrossAction<TArgs>
) => System<TArgs, T>;

const createSystemOfQuery: CreateSystemOfQuery =
  (query, f) =>
  (world, ...args) => {
    const ids = query(world) as EntityId[];
    for (let i = 0; i < ids.length; ++i) {
      f(ids[i], ...args);
    }
    return world;
  };

const createSystemOf2Queries: CreateSystemOf2Queries =
  (lhsQuery, rhsQuery, f) =>
  (world, ...args) => {
    const lhsIds = lhsQuery(world) as EntityId[];
    const rhsIds = rhsQuery(world) as EntityId[];
    for (let i = 0; i < lhsIds.length; ++i) {
      for (let j = 0; j < rhsIds.length; ++j) {
        f(lhsIds[i], rhsIds[j], ...args);
      }
    }
    return world;
  };

const createSystemOf2QueriesDistinct: CreateSystemOf2Queries =
  (lhsQuery, rhsQuery, f) =>
  (world, ...args) => {
    const lhsIds = lhsQuery(world) as EntityId[];
    const rhsIds = rhsQuery(world) as EntityId[];
    for (let i = 0; i < lhsIds.length; ++i) {
      for (let j = 0; j < rhsIds.length; ++j) {
        if (lhsIds[i] !== rhsIds[j]) {
          f(lhsIds[i], rhsIds[j], ...args);
        }
      }
    }
    return world;
  };

type SystemSpec<T extends IWorld> =
  | System<[], T>
  | { query: Query; action: (id: EntityId) => void }
  | {
      distinct?: boolean;
      queries: [Query, Query];
      crossAction: (lhsId: EntityId, rhsId: EntityId) => void;
    }
  | SystemSpec<T>[];

export const createSystem = <T extends IWorld>(
  spec: SystemSpec<T>
): System<[], T> => {
  if (Array.isArray(spec)) {
    const systems = spec.map(createSystem);
    return (value) => {
      let result = value;
      for (let i = 0; i < systems.length; ++i) {
        result = systems[i](result);
      }
      return result;
    };
  }

  if ("query" in spec) {
    return createSystemOfQuery(spec.query, spec.action);
  }

  if ("queries" in spec) {
    if (spec.distinct) {
      return createSystemOf2QueriesDistinct(
        spec.queries[0],
        spec.queries[1],
        spec.crossAction
      );
    }

    return createSystemOf2Queries(
      spec.queries[0],
      spec.queries[1],
      spec.crossAction
    );
  }

  return spec;
};
