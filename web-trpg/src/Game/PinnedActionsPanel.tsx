import { ComponentPropsWithRef } from "react";
import { Panel } from "../structural/Panel";
import { ActionButton } from "./ActionButton";
import { usePinnedActions } from "./context/StdbContext/components";
import "./PinnedActionsPanel.css";

/**
 * The pinned-actions bar: the entity's chosen actions, each automatically
 * hotkeyed by its position (1..9, then 0). Buttons carry no explicit target,
 * so a press binds the current focus — with lone-hostile auto-focus, the
 * routine battle turn is one keypress.
 */
export const PinnedActionsPanel = (
  props: ComponentPropsWithRef<typeof Panel>,
) => {
  const pinnedActions = usePinnedActions();

  return (
    <Panel {...props}>
      <div className="PinnedActions">
        {pinnedActions.slice(0, 10).map((actionId, index) => {
          const hotkey = `${(index + 1) % 10}`;
          return (
            <span key={actionId} className="pinnedAction">
              <span className="hotkey">{hotkey}</span>
              <ActionButton actionId={actionId} hotkey={hotkey} />
            </span>
          );
        })}
      </div>
    </Panel>
  );
};
