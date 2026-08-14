import { useContext } from "react";
import { StdbContext } from "./StdbContext";

export const useStdbConnection = () => {
  const { connection } = useContext(StdbContext);
  return connection;
};

export const useStdbIdentity = () => {
  const { identity } = useContext(StdbContext);
  return identity;
};

/** True once the initial subscription sync has applied — the earliest
 * moment an absent row may be read as a real absence. */
export const useStdbSynced = () => {
  const { synced } = useContext(StdbContext);
  return synced;
};
