import { ComponentPropsWithoutRef, useCallback } from "react";
import { Panel } from "../../structural/Panel";
import { useHotkeyRef } from "../../structural/useHotkeyRef";
import { ActionButton } from "../ActionButton";
import {
  useActionOptions,
  useAllegiance,
  usePlayerEntity,
  useStdbConnection,
  useTarget,
} from "../context/StdbContext";
import { EPBar } from "./EPBar";
import { HPBar } from "./HPBar";
import "./index.css";
import { EntityId } from "../trpg";

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
  const playerAllegiance = useAllegiance(playerEntity);
  const allegiance = useAllegiance(entity);
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
        allegiance == null
          ? ""
          : allegiance !== playerAllegiance
          ? "hostile"
          : "friendly",
        entity === target ? "targetted" : "",
      ].join(" ")}
      onClick={targetThis}
    >
      <div>{/* WIP Add name */ `Entity ${entity}`}</div>
      <HPBar entity={entity} />
      <EPBar entity={entity} />
      {detailed && <ActionBar />}
      {hotkey != null && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </Panel>
  );
};
