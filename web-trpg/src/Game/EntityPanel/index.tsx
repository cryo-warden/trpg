import { ComponentPropsWithoutRef, useCallback } from "react";
import { useGetClassName } from "../../renderer/useGetClassName";
import { Panel } from "../../structural/Panel";
import { useHotkeyRef } from "../../structural/useHotkeyRef";
import { ActionButton } from "../ActionButton";
import {
  useActionOptions,
  usePlayerEntity,
} from "../context/StdbContext/components";
import { EntityName } from "../EntityName";
import { EntityId } from "../trpg";
import { EPBar } from "./EPBar";
import { HPBar } from "./HPBar";
import "./index.css";
import { useFocus, useSetFocus } from "../context/FocusContext";

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
  const focusThis = useCallback(() => {
    setFocus(entity);
  }, [entity, setFocus]);

  const panelRef = useHotkeyRef<HTMLDivElement>(hotkey);

  const ActionBar = () => {
    const actions = useActionOptions(entity);
    return (
      <div className="ActionBar">
        {actions.map((action) => (
          <ActionButton key={action} actionId={action} target={entity} />
        ))}
      </div>
    );
  };

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
      ].join(" ")}
      onClick={focusThis}
    >
      <div>
        <EntityName entityId={entity} />
      </div>
      <HPBar entity={entity} />
      <EPBar entity={entity} />
      {detailed && <ActionBar />}
      {hotkey != null && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </Panel>
  );
};
