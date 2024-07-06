export type IdDictionary<T> = {
  get: (key: unknown) => T;
  /**
   * Evaluate the given function. Any dictionary entry which is not visited
   * during that evaluation will be removed from the dictionary.
   */
  withGarbageCollection: <U>(f: () => U) => U;
};

export const createIdDictionary = <T>(generate: () => T): IdDictionary<T> => {
  const dictionary = new Map<any, T>();
  let unvisitedSet: Set<unknown> | null = null;
  return {
    get: (key) => {
      if (unvisitedSet != null) {
        unvisitedSet.delete(key);
      }

      const result = dictionary.get(key);

      if (result == null) {
        const newResult = generate();
        dictionary.set(key, newResult);
        return newResult;
      }

      return result;
    },
    withGarbageCollection: (f) => {
      try {
        unvisitedSet = new Set(dictionary.keys());

        const result = f();

        if (unvisitedSet != null) {
          for (const id of unvisitedSet) {
            dictionary.delete(id);
          }
        }

        return result;
      } finally {
        unvisitedSet = null;
      }
    },
  };
};

type EphemeralDictionary<T> = {
  compress: (retainedKeys: number[]) => void;
  insert: (newValue: T) => number;
  get: (key: number) => T;
};

export const createEphemeralDictionary = <T>(): EphemeralDictionary<T> => {
  let values: T[] = [];

  return {
    compress: (retainedKeys) => {
      values = retainedKeys.map((key) => values[key]);
    },
    insert: (newValue) => {
      values.push(newValue);
      return values.length - 1;
    },
    get: (key) => values[key],
  };
};
