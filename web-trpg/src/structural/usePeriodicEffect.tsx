import { useEffect } from "react";

export const usePeriodicEffect = (
  createEffect: () => () => void,
  period: number,
  dependencies: any[]
): void => {
  useEffect(() => {
    const effect = createEffect();

    let isCancelled = false;
    let timeout: Timer | null = null;

    const update = () => {
      if (isCancelled) {
        return;
      }

      effect();
      timeout = setTimeout(update, period);
    };

    timeout = setTimeout(update, period);

    () => {
      isCancelled = true;
      if (timeout != null) {
        clearTimeout(timeout);
      }
    };
  }, dependencies);
};
