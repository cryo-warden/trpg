import { Context, createContext, ReactNode, useContext, useMemo } from "react";
import { useEngine } from "../context/EngineContext";
import { Token, useToken } from "../../structural/mutable";
import { Entity, PlayerController } from "../entities";

export type ControllerContext = Context<{
  controllerId: string;
}>;

export const ControllerContext: ControllerContext = createContext({
  controllerId: "",
});

export const useControllerEntityToken = ():
  | Token<Entity & { controller: PlayerController }>
  | Token<null> => {
  const engine = useEngine();
  useToken(engine);

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

  const entity = entityQuery.first;

  if (controllerId === "" || entity == null) {
    return useToken(null);
  }

  // TODO Remove this any cast by making playerController a distinct component.
  return useToken(entity) as any;
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
