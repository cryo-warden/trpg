import { useReducer } from "react";

class UpdateController {
  private forceUpdateFunctions: (() => void)[] = [];

  useForceUpdate() {
    const [_, forceUpdate] = useReducer((i) => (i + 1) % 999999, 0);
    this.forceUpdateFunctions.push(() => forceUpdate());
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

export const useWatchable = <T,>(value: T): void => {
  if (value == null || value !== Object(value)) {
    // Use an unwatched object to ensure the hook is still activated.
    new UpdateController().useForceUpdate();
    return;
  }

  if (!watchableMap.has(value)) {
    watchableMap.set(value, new UpdateController());
  }

  const updateController = watchableMap.get(value);
  if (updateController == null) {
    throw new Error(
      "This should be unreachable. Something strange is happening. Was the WeakMap class altered?"
    );
  }

  updateController.useForceUpdate();
};

export const updateWatchable = <T,>(value: T): void => {
  if (value == null || value !== Object(value)) {
    return;
  }

  const updateController = watchableMap.get(value);
  if (updateController == null) {
    return;
  }

  updateController.forceUpdate();
};
