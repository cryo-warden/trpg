import { createEngine, Engine } from "action-trpg-lib";
import { Context, createContext, ReactNode, useContext, useMemo } from "react";

export type EngineContext = Context<{
  engine: Engine;
}>;

export const EngineContext: EngineContext = createContext({
  engine: createEngine(),
});

export const useEngine = () => {
  const { engine } = useContext(EngineContext);
  return engine;
};

export const WithEngine = ({
  engine,
  children,
}: {
  engine: Engine;
  children: ReactNode;
}) => {
  const value = useMemo(() => ({ engine }), [engine]);
  return (
    <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
  );
};
