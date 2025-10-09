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
import { useSetTarget, useTarget } from "../context/TargetContext";

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
  const target = useTarget();
  const setTarget = useSetTarget();
  const targetThis = useCallback(() => {
    setTarget(entity);
  }, [entity, setTarget]);

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
        entity === target ? "targeted" : "",
      ].join(" ")}
      onClick={targetThis}
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
