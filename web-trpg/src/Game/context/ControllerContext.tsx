import { With } from "miniplex";
import { Context, createContext, ReactNode, useContext, useMemo } from "react";
import { useEngine } from "../context/EngineContext";
import { Token, useToken } from "../../structural/mutable";
import { Entity } from "../trpg";

export type ControllerContext = Context<{
  controllerId: string;
}>;

export const ControllerContext: ControllerContext = createContext({
  controllerId: "",
});

export const useControllerEntityToken = ():
  | Token<With<Entity, "playerController">>
  | Token<null> => {
  const engine = useEngine();
  useToken(engine);

  const { controllerId } = useContext(ControllerContext);

  const entityQuery = useMemo(
    () =>
      engine.world
        .with("playerController")
        .where((entity) => entity.playerController.id === controllerId),
    [engine, controllerId]
  );

  const entity = entityQuery.first;

  if (controllerId === "" || entity == null) {
    return useToken(null);
  }

  return useToken(entity);
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
