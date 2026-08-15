import { ComponentPropsWithRef, useMemo } from "react";
import { Panel } from "../structural/Panel";
import { Button } from "../structural/Button";
import { ActionButton } from "./ActionButton";
import {
  useActionOptions,
  useOfferedActionIdsOf,
  usePinnedActions,
} from "./context/StdbContext/components";
import { useFocus } from "./context/FocusContext";
import { ACTION_HOTKEYS, actionHotkeyFor } from "./domain/hotkeys";
import "./PinnedActionsPanel.css";

/**
 * THE action bar. Slot 0 is ACTIVATE — a pseudo-action that fires the
 * focus's own custom offer (a chest's open, a crack's squeeze, a path's
 * move verb), disabled when the focus offers nothing valid. Then the
 * CONFIGURED slots: every pinned action holds its position and hotkey
 * even while invalid (visibly disabled — stable keys over shifting
 * lists). Then every OTHER currently-valid action against the focus,
 * offered and derived verbs included, in option order. Hotkeys run down
 * this final rendered list on the right home row.
 */
export const PinnedActionsPanel = (
  props: ComponentPropsWithRef<typeof Panel>,
) => {
  const pinnedActions = usePinnedActions();
  const focus = useFocus();
  const validOptions = useActionOptions(focus);
  const focusOfferedIds = useOfferedActionIdsOf(focus);

  // The focus's CUSTOM offer: its first authored offered action that is
  // valid right now (derived verbs live in the registry, not here).
  const activateActionId = useMemo(
    () => focusOfferedIds.find((id) => validOptions.includes(id)) ?? null,
    [focusOfferedIds, validOptions],
  );

  const extras = validOptions.filter(
    (id) => !pinnedActions.includes(id) && id !== activateActionId,
  );
  const configured = pinnedActions.slice(
    0,
    Math.max(0, ACTION_HOTKEYS.length - 1),
  );

  return (
    <Panel {...props}>
      <div className="PinnedActions">
        {activateActionId != null ? (
          <ActionButton
            actionId={activateActionId}
            hotkey={actionHotkeyFor(0)}
          />
        ) : (
          <Button disabled hotkey={actionHotkeyFor(0)}>
            Activate
          </Button>
        )}
        {configured.map((actionId, index) => (
          <ActionButton
            key={actionId}
            actionId={actionId}
            hotkey={actionHotkeyFor(index + 1)}
          />
        ))}
        {extras
          .slice(0, Math.max(0, ACTION_HOTKEYS.length - 1 - configured.length))
          .map((actionId, index) => (
            <ActionButton
              key={actionId}
              actionId={actionId}
              hotkey={actionHotkeyFor(configured.length + 1 + index)}
            />
          ))}
      </div>
    </Panel>
  );
};
