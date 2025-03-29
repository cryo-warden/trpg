import { Action } from "action-trpg-lib/src/structures/Action";
import { useCallback, useEffect, useRef } from "react";
import { updateWatchable } from "../../structural/useWatchable";
import { useControllerEntity } from "../context/ControllerContext";

export const useSetActionHotkey = (action: Action) => {
  const entity = useControllerEntity();
  const isPointerInRef = useRef(false);

  const setPointerIn = useCallback(() => {
    isPointerInRef.current = true;
  }, [isPointerInRef]);

  const setPointerOut = useCallback(() => {
    isPointerInRef.current = false;
  }, [isPointerInRef]);

  useEffect(() => {
    const abortController = new AbortController();
    document.addEventListener(
      "keydown",
      (e) => {
        if (isPointerInRef.current && entity?.controller != null) {
          entity.controller.hotkeyMap[action.name] = e.key;
          updateWatchable(entity);
        }
      },
      abortController
    );
    return () => {
      abortController.abort();
    };
  }, [entity, isPointerInRef]);

  return {
    onPointerOver: setPointerIn,
    onPointerOut: setPointerOut,
  };
};
