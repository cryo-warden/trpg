import { ComponentPropsWithoutRef, useCallback } from "react";
import { Panel } from "../../structural/Panel";
import { useHotkeyRef } from "../../structural/useHotkeyRef";
import { ActionButton } from "../ActionButton";
import {
  useActionOptions,
  useAllegiance,
  usePlayerEntity,
} from "../context/StdbContext";
import { useTarget } from "../context/TargetContext";
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
  const playerEntity = usePlayerEntity();
  const playerAllegiance = useAllegiance(playerEntity);
  const allegiance = useAllegiance(entity);
  const actions = useActionOptions(entity);
  const { target, setTarget } = useTarget();
  const targetThis = useCallback(() => {
    setTarget(entity);
  }, [entity, setTarget]);

  const panelRef = useHotkeyRef<HTMLDivElement>(hotkey);

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
      {detailed && (
        <>
          <div className="ActionBar">
            {actions.map((action) => (
              <ActionButton key={action} actionId={action} target={entity} />
            ))}
          </div>
        </>
      )}
      {hotkey != null && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </Panel>
  );
};
