import { Identity } from "spacetimedb";
import { Context, createContext } from "react";
import { DbConnection } from "../../../stdb";

export type StdbContext = Context<{
  connection: DbConnection;
  identity: Identity;
}>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StdbContext: StdbContext = createContext(null as any);
