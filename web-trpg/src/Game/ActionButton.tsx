import { ComponentPropsWithoutRef, useCallback } from "react";
import { Button } from "../structural/Button";
import "./ActionButton.css";
import {
  useActionStateComponent,
  usePlayerEntity,
  useQueuedActionStateComponent,
} from "./context/StdbContext/components";
import { useActionName } from "./context/StdbContext/rendering";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { ActionId, EntityId } from "./trpg";
import { useFocus } from "./context/FocusContext";

export const ActionButton = ({
  target,
  actionId,
  hotkey,
  ...props
}: {
  /** The action's explicit target; a single-target action with no explicit
   * target binds the current focus. */
  target?: EntityId;
  actionId: ActionId;
} & ComponentPropsWithoutRef<typeof Button>) => {
  const connection = useStdbConnection();
  const playerEntity = usePlayerEntity();
  const focus = useFocus();
  const finalTarget = target ?? focus;
  const queueAction = useCallback(() => {
    if (playerEntity == null || finalTarget == null) {
      return;
    }

    connection.reducers.act({ actionId, targetEntityId: finalTarget });
  }, [playerEntity, finalTarget, actionId, connection.reducers]);

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
