import { Identity } from "spacetimedb";
import { Context, createContext } from "react";
import { DbConnection } from "../../../stdb";

export type StdbContext = Context<{
  connection: DbConnection;
  identity: Identity;
  /** True once the initial subscription sync has APPLIED: before this,
   * absent rows mean "not loaded yet", never "does not exist" — no one
   * may act on an absence (e.g. auto-creating an account) until then. */
  synced: boolean;
}>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const StdbContext: StdbContext = createContext(null as any);
