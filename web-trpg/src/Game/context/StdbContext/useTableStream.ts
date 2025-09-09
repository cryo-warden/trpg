import { useEffect, useState } from "react";
import { RemoteTables } from "../../../stdb";
import { useStdbConnection } from "./useStdb";
import { RowType } from "./RowType";

// In React hook deps, treat any empty array as the same empty array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emptyGuard: any = [];
const guardEmpty = <T>(value: T): T => {
  if (Array.isArray(value) && value.length <= 0) {
    return emptyGuard;
  }
  return value;
};

export const useTableStream = <
  T extends keyof RemoteTables,
  R extends RowType<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (row: R) => any
>(
  tableName: T,
  compute: F,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[]
): ReturnType<F>[] => {
  const connection = useStdbConnection();
  const [result, setResult] = useState([] as ReturnType<F>[]);

  useEffect(() => {
    const handleInsert = (_: never, row: R) => {
      console.log(row);
      setResult((result) => [...result, compute(row)]);
    };
    connection.db[tableName].onInsert(handleInsert as never);
    return () => {
      connection.db[tableName].removeOnInsert(handleInsert as never);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, setResult, ...deps.map(guardEmpty)]);

  return result;
};
