import { ComponentPropsWithoutRef, useCallback } from "react";
import { Button } from "../structural/Button";
import "./ActionButton.css";
import { useTarget } from "./context/TargetContext";
import { ActionId, EntityId } from "./trpg";
import { usePlayerEntity, useStdbConnection } from "./context/StdbContext";

export const ActionButton = ({
  target,
  action,
  ...props
}: {
  target?: EntityId;
  action: ActionId;
} & ComponentPropsWithoutRef<typeof Button>) => {
  const connection = useStdbConnection();
  const playerEntity = usePlayerEntity();
  const { target: contextualTarget } = useTarget();
  const finalTarget = target ?? contextualTarget;
  const hotkey = "WIP";
  // controllerEntityToken.value?.playerController.hotkeyMap[action];
  const queueAction = useCallback(() => {
    if (playerEntity == null || finalTarget == null) {
      return;
    }

    connection.reducers.act(action, finalTarget);
  }, [playerEntity, finalTarget, action]);

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
