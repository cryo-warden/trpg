import { ComponentPropsWithoutRef, useCallback } from "react";
import { Button } from "../structural/Button";
import "./ActionButton.css";
import { useTarget } from "./context/TargetContext";
import { ActionName, EntityId } from "./trpg";

export const ActionButton = ({
  target,
  action,
  ...props
}: {
  target?: EntityId;
  action: ActionName;
} & ComponentPropsWithoutRef<typeof Button>) => {
  const controllerEntityToken = 1; // WIP useControllerEntityToken();
  const { target: contextualTargetToken } = useTarget();
  const finalTargetToken = target ?? contextualTargetToken;
  const hotkey = "WIP";
  // controllerEntityToken.value?.playerController.hotkeyMap[action];
  const queueAction = useCallback(() => {
    if (controllerEntityToken == null) {
      return;
    }
    // WIP
    // controllerEntityToken.value.playerController.actionQueue.splice(0, 1, {
    //   action,
    //   targets: finalTargetToken.value == null ? [] : [finalTargetToken.value],
    // });
    // regenerateToken(controllerEntityToken);
  }, [controllerEntityToken, finalTargetToken, action]);

  const isActive = false; // WIP controllerEntityToken.value?.actionState?.action === action;

  // WIP
  const isQueued = false;
  // controllerEntityToken.value?.playerController.actionQueue.some(
  //   (queuedAction) => queuedAction.action === action
  // );

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
