import { ComponentPropsWithoutRef, useCallback } from "react";
import { useGetClassName } from "../../renderer/useGetClassName";
import { Panel } from "../../structural/Panel";
import { useHotkeyRef } from "../../structural/useHotkeyRef";
import { ActionButton } from "../ActionButton";
import {
  useActionOptions,
  usePlayerEntity,
  useTarget,
} from "../context/StdbContext/components";
import { useStdbConnection } from "../context/StdbContext/useStdb";
import { EntityName } from "../EntityName";
import { EntityId } from "../trpg";
import { EPBar } from "./EPBar";
import { HPBar } from "./HPBar";
import "./index.css";

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
  const connection = useStdbConnection();
  const playerEntity = usePlayerEntity();
  const getClassName = useGetClassName(playerEntity);
  const target = useTarget(playerEntity);
  const targetThis = useCallback(() => {
    connection.reducers.target(entity);
  }, [entity, connection]);

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
        entity === target ? "targetted" : "",
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
