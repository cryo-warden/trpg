import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { Context, createContext } from "react";
import { DbConnection } from "../../../stdb";

export type StdbContext = Context<{
  connection: DbConnection;
  identity: Identity;
}>;

export const StdbContext: StdbContext = createContext(null as any);
