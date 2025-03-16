import "./ActionButton.css";
import { Entity } from "action-trpg-lib";
import { Action } from "action-trpg-lib/src/structures/Action";
import { ReactNode } from "react";
import { updateWatchable } from "../structural/useWatchable";
import { useControllerEntity } from "./context/ControllerContext";
import { useTarget } from "./context/TargetContext";

export const ActionButton = ({
  target,
  action,
  children,
}: {
  target?: Entity;
  action: Action;
  children: ReactNode;
}) => {
  const entity = useControllerEntity();
  const { target: contextualTarget } = useTarget();
  const finalTarget = target ?? contextualTarget;
  return (
    <button
      className="ActionButton"
      onClick={() => {
        if (entity?.controller?.type !== "player") {
          return;
        }
        entity.controller.actionQueue.push({
          action,
          targets: finalTarget == null ? [] : [finalTarget],
        });
        updateWatchable(entity);
      }}
    >
      {children}
    </button>
  );
};
