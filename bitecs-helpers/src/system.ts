import { IWorld, Query, System } from "bitecs";

export const createSystemOfQuery = <
  R extends any[] = any[],
  T extends IWorld = IWorld
>(
  query: Query<T>,
  action: (id: number, value: T, ...args: R) => void
): System<R, T> => {
  return (value, ...args) => {
    const ids = query(value);
    for (let i = 0; i < ids.length; ++i) {
      action(ids[i], value, ...args);
    }
    return value;
  };
};

export const createSystemOf2Queries = <
  R extends any[] = any[],
  T extends IWorld = IWorld
>(
  [lhsQuery, rhsQuery]: [Query<T>, Query<T>],
  crossAction: (lhsId: number, rhsId: number, value: T, ...args: R) => void
): System<R, T> => {
  return (value, ...args) => {
    const lhsIds = lhsQuery(value);
    const rhsIds = rhsQuery(value);
    for (let i = 0; i < lhsIds.length; ++i) {
      for (let j = 0; j < rhsIds.length; ++j) {
        crossAction(lhsIds[i], rhsIds[j], value, ...args);
      }
    }
    return value;
  };
};

export const createSystemOf2QueriesDistinct = <
  R extends any[] = any[],
  T extends IWorld = IWorld
>(
  [lhsQuery, rhsQuery]: [Query<T>, Query<T>],
  crossAction: (lhsId: number, rhsId: number, value: T, ...args: R) => void
): System<R, T> => {
  return (value, ...args) => {
    const lhsIds = lhsQuery(value);
    const rhsIds = rhsQuery(value);
    for (let i = 0; i < lhsIds.length; ++i) {
      for (let j = 0; j < rhsIds.length; ++j) {
        if (lhsIds[i] !== rhsIds[j]) {
          crossAction(lhsIds[i], rhsIds[j], value, ...args);
        }
      }
    }
    return value;
  };
};

type PipelineReturn<TFns> = TFns extends System<any[], infer T>[] ? T : never;

type Variadic<TFn> = TFn extends (...args: infer A) => infer R
  ? (...args: [...A, ...unknown[]]) => R
  : never;

// Must explicitly treat functions as Variadic to correctly compute the
// combined parameters.
type PipelineParameters<TFns extends any[]> = Variadic<
  TFns[number]
> extends System<infer TRestParameters>
  ? TRestParameters
  : never;

export const createSystemOfPipeline =
  <TPipelines extends System<any[], any>[]>(
    ...pipelines: TPipelines
  ): System<PipelineParameters<TPipelines>, PipelineReturn<TPipelines>> =>
  (initialValue, ...restArgs) => {
    let value = initialValue;
    for (let i = 0; i < pipelines.length; ++i) {
      value = pipelines[i](value, ...restArgs);
    }
    return value;
  };
