import { useEffect } from "react";

export const usePeriodicEffect = (
  createEffect: () => () => void,
  periodMS: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dependencies: any[]
): void => {
  useEffect(() => {
    const effect = createEffect();

    let isCancelled = false;
    let timeout: NodeJS.Timeout | null = null;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};
