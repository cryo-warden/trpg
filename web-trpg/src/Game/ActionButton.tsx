import "./ActionButton.css";
import { Entity } from "action-trpg-lib";
import { Action } from "action-trpg-lib/src/structures/Action";
import { updateWatchable } from "../structural/useWatchable";
import { useControllerEntity } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";
import { useCallback, useEffect, useState } from "react";

const hotkeySet = new Set<string>();

export const ActionButton = ({
  target,
  action,
  hotkey,
}: {
  target?: Entity;
  action: Action;
  hotkey?: string;
}) => {
  const [isPointerIn, setIsPointerIn] = useState(false);
  const entity = useControllerEntity();
  const { target: contextualTarget } = useTarget();
  const finalTarget = target ?? contextualTarget;
  const queueAction = useCallback(() => {
    if (entity?.controller?.type !== "player") {
      return;
    }
    entity.controller.actionQueue.push({
      action,
      targets: finalTarget == null ? [] : [finalTarget],
    });
    updateWatchable(entity);
  }, [
    entity?.controller?.type,
    entity?.controller.actionQueue,
    finalTarget,
    action,
  ]);

  const setPointerIn = useCallback(() => {
    setIsPointerIn(true);
  }, [setIsPointerIn]);

  const setPointerOut = useCallback(() => {
    setIsPointerIn(false);
  }, [setIsPointerIn]);

  useEffect(() => {
    if (hotkey != null) {
      if (hotkeySet.has(hotkey)) {
        console.warn(`Hotkey "${hotkey}" is already used elsewhere.`);
        return;
      } else {
        hotkeySet.add(hotkey);
      }
    }

    const abortController = new AbortController();
    document.addEventListener(
      "keydown",
      (e) => {
        if (isPointerIn) {
          if (entity?.controller != null) {
            entity.controller.hotkeyMap[action.name] = e.key;
          }
          updateWatchable(entity);
        } else if (e.key === hotkey) {
          queueAction();
        }
      },
      abortController
    );

    return () => {
      abortController.abort();
      if (hotkey != null) {
        hotkeySet.delete(hotkey);
      }
    };
  }, [isPointerIn, queueAction, hotkey]);

  return (
    <button
      className="ActionButton"
      onClick={(e) => {
        e.stopPropagation();
        queueAction();
      }}
      onPointerOver={setPointerIn}
      onPointerOut={setPointerOut}
    >
      {action.name}
      {hotkey && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </button>
  );
};
