import { Entity } from "action-trpg-lib";
import { Action } from "action-trpg-lib/src/structures/Action";
import { ComponentPropsWithoutRef, useCallback } from "react";
import { Button } from "../structural/Button";
import { regenerateToken, Token } from "../structural/mutable";
import "./ActionButton.css";
import { useControllerEntityToken } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";

export const ActionButton = ({
  targetToken,
  action,
  ...props
}: {
  targetToken?: Token<Entity>;
  action: Action;
} & ComponentPropsWithoutRef<typeof Button>) => {
  const controllerEntityToken = useControllerEntityToken();
  const { targetToken: contextualTargetToken } = useTarget();
  const finalTargetToken = targetToken ?? contextualTargetToken;
  const hotkey = controllerEntityToken.value?.controller.hotkeyMap[action.name];
  const queueAction = useCallback(() => {
    if (controllerEntityToken.value == null) {
      return;
    }
    controllerEntityToken.value.controller.actionQueue.splice(0, 1, {
      action,
      targets: finalTargetToken.value == null ? [] : [finalTargetToken.value],
    });
    regenerateToken(controllerEntityToken);
  }, [controllerEntityToken, finalTargetToken, action]);

  const isActive =
    controllerEntityToken.value?.actionState?.action.name === action.name;

  const isQueued = controllerEntityToken.value?.controller.actionQueue.some(
    (queuedAction) => queuedAction.action.name === action.name
  );

  return (
    <Button
      {...props}
      className={[
        "ActionButton",
        isQueued ? "queued" : "",
        isActive ? "active" : "",
      ].join(" ")}
      hotkey={hotkey}
      onClick={queueAction}
    >
      {action.name}
    </Button>
  );
};
