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
