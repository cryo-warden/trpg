import { ComponentPropsWithRef } from "react";
import { Panel } from "../structural/Panel";
import { ActionButton } from "./ActionButton";
import { usePinnedActions } from "./context/StdbContext/components";
import { ACTION_HOTKEYS, actionHotkeyFor } from "./domain/hotkeys";
import "./PinnedActionsPanel.css";

/**
 * The pinned-actions bar: the entity's chosen actions, each automatically
 * hotkeyed by its position on the RIGHT home row (jkl; then the rows
 * around it — see ACTION_HOTKEYS). Buttons carry no explicit target, so
 * a press binds the current focus — with lone-hostile auto-focus, the
 * routine battle turn is one keypress.
 */
export const PinnedActionsPanel = (
  props: ComponentPropsWithRef<typeof Panel>,
) => {
  const pinnedActions = usePinnedActions();

  return (
    <Panel {...props}>
      <div className="PinnedActions">
        {pinnedActions.slice(0, ACTION_HOTKEYS.length).map((actionId, index) => (
          <ActionButton
            key={actionId}
            actionId={actionId}
            hotkey={actionHotkeyFor(index)}
          />
        ))}
      </div>
    </Panel>
  );
};
