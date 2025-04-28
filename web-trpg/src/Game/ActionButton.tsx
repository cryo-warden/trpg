import { ComponentPropsWithoutRef, useCallback } from "react";
import { Button } from "../structural/Button";
import { regenerateToken, Token } from "../structural/mutable";
import "./ActionButton.css";
import { useControllerEntityToken } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";
import { ActionName, Entity } from "./trpg";

export const ActionButton = ({
  targetToken,
  action,
  ...props
}: {
  targetToken?: Token<Entity>;
  action: ActionName;
} & ComponentPropsWithoutRef<typeof Button>) => {
  const controllerEntityToken = useControllerEntityToken();
  const { targetToken: contextualTargetToken } = useTarget();
  const finalTargetToken = targetToken ?? contextualTargetToken;
  const hotkey =
    controllerEntityToken.value?.playerController.hotkeyMap[action];
  const queueAction = useCallback(() => {
    if (controllerEntityToken.value == null) {
      return;
    }
    controllerEntityToken.value.playerController.actionQueue.splice(0, 1, {
      action,
      targets: finalTargetToken.value == null ? [] : [finalTargetToken.value],
    });
    regenerateToken(controllerEntityToken);
  }, [controllerEntityToken, finalTargetToken, action]);

  const isActive = controllerEntityToken.value?.actionState?.action === action;

  const isQueued =
    controllerEntityToken.value?.playerController.actionQueue.some(
      (queuedAction) => queuedAction.action === action
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
      {action}
    </Button>
  );
};
