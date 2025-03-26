import "./ActionButton.css";
import { Entity } from "action-trpg-lib";
import { Action } from "action-trpg-lib/src/structures/Action";
import { updateWatchable } from "../structural/useWatchable";
import { useControllerEntity } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";
import { useCallback, useEffect } from "react";

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

  useEffect(() => {
    if (hotkey == null) {
      return;
    }

    if (hotkeySet.has(hotkey)) {
      console.warn(`Hotkey "${hotkey}" is already used elsewhere.`);
      return;
    }

    const abortController = new AbortController();
    document.addEventListener(
      "keydown",
      (e) => {
        if (e.key === hotkey) {
          queueAction();
        }
      },
      abortController
    );
    hotkeySet.add(hotkey);
    return () => {
      abortController.abort();
      hotkeySet.delete(hotkey);
    };
  }, [queueAction, hotkey]);

  return (
    <button
      className="ActionButton"
      onClick={(e) => {
        e.stopPropagation();
        queueAction();
      }}
    >
      {action.name}
      {hotkey && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </button>
  );
};
