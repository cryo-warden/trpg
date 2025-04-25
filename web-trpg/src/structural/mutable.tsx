import { useReducer } from "react";

/** A simple wrapper intended to bring mutable objects into a React-safe state model. */
export type Token<T> = { readonly value: T };

class UpdateController<T> {
  private token: Token<T>;
  private dispatches: (() => void)[] = [];

  constructor(value: T) {
    this.token = { value };
  }

  useToken() {
    // The method `regenerateToken` is the only place where a token mutation is allowed to occur.
    const [token, dispatch] = useReducer(() => this.token, this.token);
    this.dispatches.push(dispatch);
    return token;
  }

  regenerateToken() {
    this.token = { value: this.token.value };
    const { dispatches: forceUpdateFunctions } = this;
    this.dispatches = [];
    for (let i = 0; i < forceUpdateFunctions.length; ++i) {
      const forceUpdate = forceUpdateFunctions[i];
      forceUpdate();
    }
  }
}

const controllerMap = new WeakMap<object, UpdateController<any>>();

/** A hook which returns a stable wrapper token for any given value. The wrapper is replaced if and only if a token with the same inner value is passed to `regenerateToken`. */
export const useToken = <T,>(value: T): Token<T> => {
  if (value == null || value !== Object(value)) {
    // Use an untracked instance to ensure the hook is still activated.
    return new UpdateController(value).useToken();
  }

  if (!controllerMap.has(value)) {
    controllerMap.set(value, new UpdateController(value));
  }

  const updateController = controllerMap.get(value);
  if (updateController == null) {
    throw new Error(
      "This should be unreachable. Something strange is happening. Was the WeakMap class altered?"
    );
  }

  return updateController.useToken();
};

/** Force any token with the same value as this one to regenerate. */
export const regenerateToken = <T,>(token: Token<T>): void => {
  const { value } = token;

  if (value == null || value !== Object(value)) {
    return;
  }

  const updateController = controllerMap.get(value);
  if (updateController == null) {
    return;
  }

  updateController.regenerateToken();
};
