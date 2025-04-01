import { Entity } from "action-trpg-lib";
import { Action } from "action-trpg-lib/src/structures/Action";
import { ComponentPropsWithoutRef, useCallback } from "react";
import { Button } from "../structural/Button";
import { updateWatchable } from "../structural/useWatchable";
import { useControllerEntity } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";

export const ActionButton = ({
  target,
  action,
  ...props
}: {
  target?: Entity;
  action: Action;
} & ComponentPropsWithoutRef<typeof Button>) => {
  const entity = useControllerEntity();
  const { target: contextualTarget } = useTarget();
  const finalTarget = target ?? contextualTarget;
  const hotkey = entity?.controller.hotkeyMap[action.name];
  const queueAction = useCallback(() => {
    if (entity == null) {
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
    <Button {...props} hotkey={hotkey} onClick={queueAction}>
      {action.name}
    </Button>
  );
};
