import { useCallback, useRef } from "react";
import { useHotkey } from "./useHotkey";

export const useHotkeyRef = <T extends HTMLElement = HTMLButtonElement>(
  hotkey: string | undefined
) => {
  const ref = useRef<T | null>(null);

  const clickButton = useCallback(() => {
    const element = ref.current;
    if (element != null) {
      element.click();
      element.focus();
    }
  }, [ref]);

  useHotkey(hotkey, clickButton);

  return ref;
};
