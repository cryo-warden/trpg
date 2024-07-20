type FactoryRecord<TArgs extends readonly any[]> = {
  [key: string]: (...args: TArgs) => any;
};

type FactoryRecordArgs<T> = T extends FactoryRecord<infer TArgs>
  ? TArgs
  : never;

// We give U precedence because the convention is for the rightmost value
// to overwrite values to the left, as in Object.assign.
type Merge<T, U> = {
  [key in keyof T | keyof U]: key extends keyof U
    ? U[key]
    : key extends keyof T
    ? T[key]
    : never;
};

type MergeTuple<Ts> = Ts extends readonly [infer T]
  ? T
  : Ts extends readonly [infer T, ...infer Rs]
  ? Merge<T, MergeTuple<Rs>>
  : {};

type UnwrapFactoryRecord<T extends FactoryRecord<readonly any[]>> = {
  [key in keyof T]: T[key] extends (...args: FactoryRecordArgs<T>) => infer R
    ? R
    : never;
};

type MergeFactoryRecords = <
  const Ts extends readonly FactoryRecord<readonly any[]>[]
>(
  ...factoryRecords: Ts
) => (
  ...args: FactoryRecordArgs<Ts[number]>
) => UnwrapFactoryRecord<MergeTuple<Ts>>;

export const mergeFactoryRecords: MergeFactoryRecords =
  (...factoryRecords) =>
  (...args) =>
    factoryRecords.reduce(
      (result, factoryRecord) =>
        Object.keys(factoryRecord).reduce((result, key) => {
          result[key as keyof typeof result] = factoryRecord[key](...args);
          return result;
        }, result),
      {} as ReturnType<
        ReturnType<typeof mergeFactoryRecords<typeof factoryRecords>>
      >
    );
