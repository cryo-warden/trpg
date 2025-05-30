import { ComponentPropsWithoutRef, useCallback } from "react";
import { Button } from "../structural/Button";
import "./ActionButton.css";
import { useTarget } from "./context/TargetContext";
import { ActionId, EntityId } from "./trpg";
import {
  useActionName,
  useActionStateComponent,
  usePlayerEntity,
  useQueuedActionStateComponent,
  useStdbConnection,
} from "./context/StdbContext";

export const ActionButton = ({
  target,
  actionId,
  ...props
}: {
  target?: EntityId;
  actionId: ActionId;
} & ComponentPropsWithoutRef<typeof Button>) => {
  const connection = useStdbConnection();
  const playerEntity = usePlayerEntity();
  const { target: contextualTarget } = useTarget();
  const finalTarget = target ?? contextualTarget;
  const hotkey = ""; // WIP controllerEntityToken.value?.playerController.hotkeyMap[action];
  const queueAction = useCallback(() => {
    if (playerEntity == null || finalTarget == null) {
      return;
    }

    connection.reducers.act(actionId, finalTarget);
  }, [playerEntity, finalTarget, actionId]);

  const actionName = useActionName(actionId);
  const actionStateComponent = useActionStateComponent(playerEntity);
  const queuedActionStateComponent =
    useQueuedActionStateComponent(playerEntity);

  const isActive = actionStateComponent?.actionId === actionId;
  const isQueued = queuedActionStateComponent?.actionId === actionId;

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
      {actionName}
    </Button>
  );
};
