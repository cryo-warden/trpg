import { useCallback, useEffect, useRef } from "react";
import { usePlayerEntity } from "../context/StdbContext/components";
import { ActionId } from "../trpg";

export const useSetActionHotkey = (_action: ActionId) => {
  const entityToken = usePlayerEntity();
  const isPointerInRef = useRef(false);

  const setPointerIn = useCallback(() => {
    isPointerInRef.current = true;
  }, [isPointerInRef]);

  const setPointerOut = useCallback(() => {
    isPointerInRef.current = false;
  }, [isPointerInRef]);

  useEffect(() => {
    const abortController = new AbortController();
    // WIP Store player hotkeys.
    // document.addEventListener(
    //   "keydown",
    //   (e) => {
    //     if (
    //       isPointerInRef.current &&
    //       entityToken.value?.playerController != null
    //     ) {
    //       entityToken.value.playerController.hotkeyMap[action] = e.key;
    //     }
    //   },
    //   abortController
    // );
    return () => {
      abortController.abort();
    };
  }, [entityToken, isPointerInRef]);

  return {
    onPointerOver: setPointerIn,
    onPointerOut: setPointerOut,
  };
};
