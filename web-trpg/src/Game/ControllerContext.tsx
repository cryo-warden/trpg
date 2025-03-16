import { createEngine, Engine, Entity } from "action-trpg-lib";
import { Context, createContext, ReactNode, useContext, useMemo } from "react";
import { useEngine } from "./EngineContext";
import { useWatchable } from "../structural/useWatchable";
import { PlayerController } from "action-trpg-lib/src/structures/Controller";

export type ControllerContext = Context<{
  controllerId: string;
}>;

export const ControllerContext: ControllerContext = createContext({
  controllerId: "",
});

export const useControllerEntity = ():
  | (Entity & { controller: PlayerController })
  | null => {
  const engine = useEngine();
  useWatchable(engine);

  const { controllerId } = useContext(ControllerContext);

  const entityQuery = useMemo(
    () =>
      engine.world.with("controller").where((entity) => {
        return (
          entity.controller.type === "player" &&
          entity.controller.id === controllerId
        );
      }),
    [engine, controllerId]
  );

  if (controllerId === "") {
    useWatchable(null);
    return null;
  }

  const entity = entityQuery.first;

  useWatchable(entity);
  return entity as any;
};

export const WithController = ({
  controllerId,
  children,
}: {
  controllerId: string;
  children: ReactNode;
}) => {
  const value = useMemo(() => ({ controllerId }), [controllerId]);
  return (
    <ControllerContext.Provider value={value}>
      {children}
    </ControllerContext.Provider>
  );
};
