import { createEngine, Engine } from "action-trpg-lib";
import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useReducer,
} from "react";

class UpdateController {
  private forceUpdateFunctions: (() => void)[] = [];

  useForceUpdate() {
    const [_, forceUpdate] = useReducer((i) => (i + 1) % 999999, 0);
    this.forceUpdateFunctions.push(forceUpdate);
  }

  forceUpdate() {
    const { forceUpdateFunctions } = this;
    this.forceUpdateFunctions = [];
    for (let i = 0; i < forceUpdateFunctions.length; ++i) {
      const forceUpdate = forceUpdateFunctions[i];
      forceUpdate();
    }
  }
}

const watchableMap = new WeakMap<object, UpdateController>();
export const useWatchable = <T extends object>(value: T) => {
  if (!watchableMap.has(value)) {
    watchableMap.set(value, new UpdateController());
  }

  const updateController = watchableMap.get(value);
  if (updateController == null) {
    throw new Error(
      "This should be unreachable. Something strange is happening."
    );
  }

  updateController.useForceUpdate();
};
export const updateWatchable = (value: object) => {
  const updateController = watchableMap.get(value);
  if (updateController == null) {
    return;
  }
  updateController.forceUpdate();
};

export type EngineContext = Context<{
  engine: Engine;
  updateController: UpdateController;
}>;

export const EngineContext: EngineContext = createContext({
  engine: createEngine(),
  updateController: new UpdateController(),
});

export const useEngine = () => {
  const { engine, updateController } = useContext(EngineContext);
  updateController.useForceUpdate();
  return engine;
};

export const useEngineForceUpdate = () => {
  const { updateController } = useContext(EngineContext);
  return useMemo(
    () => () => updateController.forceUpdate(),
    [updateController]
  );
};

export const WithEngine = ({
  engine,
  children,
}: {
  engine: Engine;
  children: ReactNode;
}) => {
  const updateController = useMemo(() => new UpdateController(), []);
  const value = useMemo(
    () => ({ engine, updateController }),
    [engine, updateController]
  );
  return (
    <EngineContext.Provider value={value}>{children}</EngineContext.Provider>
  );
};
