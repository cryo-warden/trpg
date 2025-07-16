import { useEffect } from "react";

export const usePeriodicEffect = (
  createEffect: () => () => void,
  periodMS: number,
  dependencies: any[]
): void => {
  useEffect(() => {
    const effect = createEffect();

    let isCancelled = false;
    let timeout: number | null = null;

    const update = () => {
      if (isCancelled) {
        return;
      }

      effect();
      timeout = setTimeout(update, periodMS);
    };

    update();

    return () => {
      isCancelled = true;
      if (timeout != null) {
        clearTimeout(timeout);
      }
    };
  }, dependencies);
};
