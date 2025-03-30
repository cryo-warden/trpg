import { Entity } from "action-trpg-lib";
import { Action } from "action-trpg-lib/src/structures/Action";
import { useCallback } from "react";
import { updateWatchable } from "../structural/useWatchable";
import "./ActionButton.css";
import { useControllerEntity } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";
import { useHotkeyRef } from "../structural/useHotkeyRef";

export const ActionButton = ({
  target,
  action,
  hotkey,
}: {
  target?: Entity;
  action: Action;
  hotkey?: string;
}) => {
  const buttonRef = useHotkeyRef(hotkey);
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

  return (
    <button
      ref={buttonRef}
      className="ActionButton"
      onClick={(e) => {
        e.stopPropagation();
        queueAction();
        const button = buttonRef.current;
        if (button != null) {
          setTimeout(() => {
            button.blur();
          }, 200);
        }
      }}
    >
      {action.name}
      {hotkey && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </button>
  );
};
