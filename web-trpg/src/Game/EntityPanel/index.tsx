import { ComponentPropsWithoutRef, useCallback } from "react";
import { useGetClassName } from "../../renderer/useGetClassName";
import { Panel } from "../../structural/Panel";
import { useHotkeyRef } from "../../structural/useHotkeyRef";
import { ActionButton } from "../ActionButton";
import {
  useActionOptions,
  useActionPhase,
  useIsBlockedPath,
  useMyVisitedLocationIds,
  usePathComponent,
  usePlayerEntity,
  useQuestItemFreshness,
} from "../context/StdbContext/components";
import { EntityName } from "../EntityName";
import { EntityId } from "../trpg";
import { EPBar } from "./EPBar";
import { HPBar } from "./HPBar";
import "./index.css";
import { useFocus, useSetFocus } from "../context/FocusContext";

/** MODULE scope on purpose: a component type created inside a render is
 * brand new every render, so React would tear down and remount the whole
 * button strip — resetting its scroll and restarting animations — every
 * time the panel re-renders (every incoming event). Element replacement
 * is reserved for a genuinely new subject (the entity-id key). */
const ActionBar = ({ entity }: { entity: EntityId }) => {
  const actions = useActionOptions(entity);
  return (
    <div className="ActionBar">
      {actions.map((action) => (
        <ActionButton key={action} actionId={action} target={entity} />
      ))}
    </div>
  );
};

export const EntityPanel = ({
  entity,
  hotkey,
  detailed = false,
  ...props
}: {
  entity: EntityId;
  hotkey?: string;
  detailed?: boolean;
} & ComponentPropsWithoutRef<typeof Panel>) => {
  const playerEntity = usePlayerEntity();
  const getClassName = useGetClassName(playerEntity);
  const focus = useFocus();
  const setFocus = useSetFocus();
  const actionPhase = useActionPhase(entity);
  // A path to somewhere the player has never stood is MORE INTERESTING —
  // the shared badge marks the unexplored.
  const path = usePathComponent(entity);
  const visited = useMyVisitedLocationIds();
  const leadsSomewhereNew =
    path != null && !visited.has(path.destinationEntityId);
  // A guarded path is not a path yet: hidden rooms and unopened
  // shortcuts stay invisible until their blocker is smashed.
  const blockedPath = useIsBlockedPath(entity);
  // Per-viewer quest-item freshness: a stinky duplicate reads as such
  // EVERYWHERE — on the ground before pickup included.
  const questFreshness = useQuestItemFreshness(entity);
  const focusThis = useCallback(() => {
    setFocus(entity);
  }, [entity, setFocus]);

  const panelRef = useHotkeyRef<HTMLDivElement>(hotkey);

  if (blockedPath) {
    return null;
  }

  return (
    <Panel
      key={entity}
      {...props}
      ref={panelRef}
      className={[
        props.className ?? "",
        "EntityPanel",
        getClassName(entity),
        entity === focus ? "focused" : "",
        leadsSomewhereNew ? "interesting" : "",
        questFreshness === "stinky" ? "stinky" : "",
      ].join(" ")}
      onClick={focusThis}
    >
      <div>
        <EntityName entityId={entity} />
        {questFreshness === "stinky" && (
          <span className="questFreshness"> (stinky)</span>
        )}
        {actionPhase === "preparing" && (
          <span className="actionPhase"> — preparing…</span>
        )}
        {actionPhase === "recovering" && (
          <span className="actionPhase"> — recovering…</span>
        )}
      </div>
      <HPBar entity={entity} />
      <EPBar entity={entity} />
      {detailed && <ActionBar entity={entity} />}
      {hotkey != null && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </Panel>
  );
};
