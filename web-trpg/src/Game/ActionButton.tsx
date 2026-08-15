import { ComponentPropsWithoutRef, useCallback } from "react";
import { Button } from "../structural/Button";
import "./ActionButton.css";
import {
  useActionOptions,
  useActionStateComponent,
  usePlayerEntity,
  useActionQueueComponent,
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
  const actionQueue = useActionQueueComponent(playerEntity);
  // A bar slot HOLDS its position and hotkey; when the action is not
  // valid against the current focus it renders visibly disabled, never
  // hidden — stable keys over shifting lists.
  const validOptions = useActionOptions(finalTarget);
  const isValid = validOptions.includes(actionId);

  const isActive = actionStateComponent?.actionId === actionId;
  const isQueued = (actionQueue?.entries ?? []).some(
    (entry) => entry.actionId === actionId,
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
      disabled={!isValid}
      onClick={queueAction}
    >
      {actionName}
    </Button>
  );
};
