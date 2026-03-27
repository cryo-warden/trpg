import { RemoteTables } from "./useTableData";

export type RowType<T extends keyof RemoteTables> = RemoteTables[T] extends {
  iter: () => Iterable<infer R>;
}
  ? R
  : never;
