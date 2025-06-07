import { RemoteTables } from "../../../stdb";
import { RowType } from "./RowType";
import { useTableData } from "./useTableData";

export const useTable =
  <T extends keyof RemoteTables>(tableName: T) =>
  () => {
    return useTableData(
      tableName,
      (table): RowType<T>[] => [...table.iter()] as any,
      []
    );
  };

// export type Id = Extract<
//   RemoteTables[keyof RemoteTables],
//   { id: any }
// >["id"]["find"] extends (id: infer ID) => any
//   ? ID
//   : never;

// const useRow =
//   <T extends keyof RemoteTables>(tableName: T) =>
//   (id: Id | null): RowType<T> | null => {
//     return useTableData(
//       tableName,
//       (table): RowType<T> | null => {
//         if (!("id" in table)) {
//           throw new Error(
//             `Table "${tableName}" used with useRow does not have an id unique index.`
//           );
//         }

//         if (id == null) {
//           return null;
//         }

//         return (table.id.find(id) as any) ?? null;
//       },
//       [id]
//     );
//   };
