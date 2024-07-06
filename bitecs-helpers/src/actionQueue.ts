type ActionQueue = {
  flush: () => void;
  push: (action: () => void) => void;
};

export const createActionQueue = (): ActionQueue => {
  let actions: (() => void)[] = [];
  return {
    flush: () => {
      for (let i = 0; i < actions.length; ++i) {
        actions[i]();
      }
      actions = [];
    },
    push: (action) => {
      actions.push(action);
    },
  };
};
