import { useEffect } from "react";

export const useHotkey = (
  hotkey: string | undefined,
  handleEvent: (event: KeyboardEvent) => void
): void =>
  useEffect(() => {
    if (hotkey == null) {
      return;
    }

    const abortController = new AbortController();
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === hotkey) {
          handleEvent(e);
        }
      },
      abortController
    );

    return () => {
      abortController.abort();
    };
  }, [hotkey, handleEvent]);
