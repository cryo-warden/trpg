import { ComponentPropsWithRef, useMemo } from "react";
import { Panel } from "../structural/Panel";
import { Button } from "../structural/Button";
import { ActionButton } from "./ActionButton";
import {
  useActionOptions,
  useOfferedActionIdsOf,
  usePinnedActions,
} from "./context/StdbContext/components";
import {
  useActionAssetOf,
  useSpecialActionIds,
} from "./context/StdbContext/assetLookup";
import { useFocus } from "./context/FocusContext";
import { ACTION_HOTKEYS, actionHotkeyFor } from "./domain/hotkeys";
import "./PinnedActionsPanel.css";

/**
 * THE action bar. Slot 0 is ACTIVATE — a pseudo-action resolving to the
 * focus's most natural verb: its own authored offer first (a chest's
 * open, a crack's squeeze), then by precedence Attune, Equip, Eat,
 * Take, Unequip, Drop; disabled when nothing applies. Then the
 * CONFIGURED slots, keyed from the row's start: every pinned action
 * holds its position and hotkey even while invalid (visibly disabled —
 * stable keys over shifting lists). DYNAMIC actions — every other
 * currently-valid option, offered and movement verbs included — fill
 * from the row's END backwards, so each keeps its key regardless of
 * how many configured actions occupy the start.
 */
export const PinnedActionsPanel = (
  props: ComponentPropsWithRef<typeof Panel>,
) => {
  const pinnedActions = usePinnedActions();
  const focus = useFocus();
  const validOptions = useActionOptions(focus);
  const focusOfferedIds = useOfferedActionIdsOf(focus);
  const specialActionIds = useSpecialActionIds();
  const actionAssetOf = useActionAssetOf();

  const activateActionId = useMemo(() => {
    // The focus's own authored offers lead; then the common verbs by
    // the fixed precedence. First valid wins.
    const attuneByType = validOptions.find(
      (id) => actionAssetOf(id)?.actionType.tag === "Attune",
    );
    const candidates = [
      ...focusOfferedIds,
      attuneByType,
      specialActionIds.equip,
      specialActionIds.eat,
      specialActionIds.take,
      specialActionIds.unequip,
      specialActionIds.drop,
    ];
    return (
      candidates.find((id) => id != null && validOptions.includes(id)) ?? null
    );
  }, [focusOfferedIds, validOptions, specialActionIds, actionAssetOf]);

  const configured = pinnedActions.slice(
    0,
    Math.max(0, ACTION_HOTKEYS.length - 1),
  );
  const extras = validOptions
    .filter((id) => !pinnedActions.includes(id) && id !== activateActionId)
    .slice(0, Math.max(0, ACTION_HOTKEYS.length - 1 - configured.length));

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
        {extras.map((actionId, index) => (
          <ActionButton
            key={actionId}
            actionId={actionId}
            // END-ALIGNED: the first dynamic action always takes the
            // row's last key, the next the one before it — consistent
            // keys no matter what's configured up front.
            hotkey={actionHotkeyFor(ACTION_HOTKEYS.length - 1 - index)}
          />
        ))}
      </div>
    </Panel>
  );
};
