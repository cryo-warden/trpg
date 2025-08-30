import { useEffect, useState } from "react";
import { RemoteTables } from "../../../stdb";
import { useStdbConnection } from "./useStdb";

// In React hook deps, treat any empty array as the same empty array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emptyGuard: any = [];
const guardEmpty = <T>(value: T): T => {
  if (Array.isArray(value) && value.length <= 0) {
    return emptyGuard;
  }
  return value;
};

export const useTableData = <
  T extends keyof RemoteTables,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (table: RemoteTables[T]) => any
>(
  tableName: T,
  compute: F,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deps: any[]
): ReturnType<F> => {
  const connection = useStdbConnection();
  const [result, setResult] = useState(() => compute(connection.db[tableName]));

  useEffect(() => {
    const refresh = () => {
      setResult(compute(connection.db[tableName]));
    };
    refresh();
    connection.db[tableName].onInsert(refresh);
    connection.db[tableName].onDelete(refresh);
    if ("onUpdate" in connection.db[tableName]) {
      connection.db[tableName].onUpdate(refresh);
    }
    return () => {
      connection.db[tableName].removeOnInsert(refresh);
      connection.db[tableName].removeOnDelete(refresh);
      if ("removeOnUpdate" in connection.db[tableName]) {
        connection.db[tableName].removeOnUpdate(refresh);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, setResult, ...deps.map(guardEmpty)]);

  return result;
};
