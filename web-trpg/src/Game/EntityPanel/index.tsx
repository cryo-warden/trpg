import { ComponentPropsWithoutRef, useCallback } from "react";
import { Panel } from "../../structural/Panel";
import { useHotkeyRef } from "../../structural/useHotkeyRef";
import { ActionButton } from "../ActionButton";
import { usePlayerEntity, useStdbConnection } from "../context/StdbContext";
import { useTarget } from "../context/TargetContext";
import { EPBar } from "./EPBar";
import { HPBar } from "./HPBar";
import "./index.css";
import { EntityId } from "../trpg";

const recommendActions = (..._args: any[]) => {
  // WIP
  return [];
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
  const engine = useStdbConnection();
  const playerEntity = usePlayerEntity();
  const { target, setTarget } = useTarget();
  const recommendedActions =
    playerEntity == null
      ? null
      : recommendActions(engine, playerEntity, entity);
  const targetThis = useCallback(() => {
    setTarget(entity);
  }, [entity, setTarget]);

  const panelRef = useHotkeyRef<HTMLDivElement>(hotkey);

  return (
    <Panel
      {...props}
      ref={panelRef}
      className={[
        props.className ?? "",
        "EntityPanel",
        // WIP
        // entityToken.value.allegiance == null || entityToken.value.unconscious
        //   ? ""
        //   : entityToken.value.allegiance !==
        //     controllerEntityToken.value?.allegiance
        //   ? "hostile"
        //   : "friendly",
        entity === target ? "targetted" : "",
      ].join(" ")}
      onClick={targetThis}
    >
      <div>{`WIP entityToken.value.name ${entity}`}</div>
      <HPBar entity={entity} />
      <EPBar entity={entity} />
      {detailed && (
        <>
          <div className="ActionBar">
            {recommendedActions?.map((action: any) => (
              <ActionButton
                key={action}
                hotkey={
                  "WIP"
                  // controllerEntityToken.value?.playerController.hotkeyMap[
                  //   action
                  // ]
                }
                action={action}
                target={entity}
              />
            ))}
          </div>
        </>
      )}
      {hotkey != null && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </Panel>
  );
};
