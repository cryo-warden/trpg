import { Query, System } from "bitecs";
import { EntityId } from "./types";

type Action<TArgs extends any[]> = (id: EntityId, ...args: TArgs) => void;

type CrossAction<TArgs extends any[]> = (
  lhsId: EntityId,
  rhsId: EntityId,
  ...args: TArgs
) => void;

type ForEach = <TArgs extends any[]>(
  ids: EntityId[],
  f: Action<TArgs>,
  ...args: TArgs
) => void;

type ForEachCross = <TArgs extends any[]>(
  lhsIds: EntityId[],
  rhsIds: EntityId[],
  f: CrossAction<TArgs>,
  ...args: TArgs
) => void;

type CreateSystemOfQuery = <TArgs extends any[]>(
  query: Query,
  f: Action<TArgs>
) => System<TArgs>;

type CreateSystemOf2Queries = <TArgs extends any[]>(
  lhsQuery: Query,
  rhsQuery: Query,
  f: CrossAction<TArgs>
) => System<TArgs>;

export const forEachEntity: ForEach = (ids, f, ...args) => {
  for (let i = 0; i < ids.length; ++i) {
    f(ids[i], ...args);
  }
};

export const forEachEntityCross: ForEachCross = (
  lhsIds,
  rhsIds,
  f,
  ...args
) => {
  for (let i = 0; i < lhsIds.length; ++i) {
    for (let j = 0; j < rhsIds.length; ++j) {
      f(lhsIds[i], rhsIds[j], ...args);
    }
  }
};

export const forEachEntityCrossDistinct: ForEachCross = (
  lhsIds,
  rhsIds,
  f,
  ...args
) => {
  for (let i = 0; i < lhsIds.length; ++i) {
    for (let j = 0; j < rhsIds.length; ++j) {
      if (lhsIds[i] !== rhsIds[j]) {
        f(lhsIds[i], rhsIds[j], ...args);
      }
    }
  }
};

export const createSystemOfQuery: CreateSystemOfQuery =
  (query, f) =>
  (world, ...args) => {
    const ids = query(world) as EntityId[];
    for (let i = 0; i < ids.length; ++i) {
      f(ids[i], ...args);
    }
    return world;
  };

export const createSystemOf2Queries: CreateSystemOf2Queries =
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

export const createSystemOf2QueriesDistinct: CreateSystemOf2Queries =
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
