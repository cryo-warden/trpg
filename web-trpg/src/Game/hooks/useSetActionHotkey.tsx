import { Action } from "action-trpg-lib/src/structures/Action";
import { useCallback, useEffect, useRef } from "react";
import { regenerateToken } from "../../structural/mutable";
import { useControllerEntityToken } from "../context/ControllerContext";

export const useSetActionHotkey = (action: Action) => {
  const entityToken = useControllerEntityToken();
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
        if (isPointerInRef.current && entityToken.value?.controller != null) {
          entityToken.value.controller.hotkeyMap[action.name] = e.key;
          regenerateToken(entityToken);
        }
      },
      abortController
    );
    return () => {
      abortController.abort();
    };
  }, [entityToken, isPointerInRef]);

  return {
    onPointerOver: setPointerIn,
    onPointerOut: setPointerOut,
  };
};
