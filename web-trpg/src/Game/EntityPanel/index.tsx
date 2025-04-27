import { recommendActions } from "action-trpg-lib";
import { ComponentPropsWithoutRef, useCallback } from "react";
import { Panel } from "../../structural/Panel";
import { useHotkeyRef } from "../../structural/useHotkeyRef";
import { ActionButton } from "../ActionButton";
import { useControllerEntityToken } from "../context/ControllerContext";
import { useEngine } from "../context/EngineContext";
import { useTarget } from "../context/TargetContext";
import { WithEntity } from "../EntityComponent";
import { EPBar } from "./EPBar";
import { HPBar } from "./HPBar";
import "./index.css";

export const EntityPanel = WithEntity<
  { hotkey?: string; detailed?: boolean } & ComponentPropsWithoutRef<
    typeof Panel
  >
>(({ entityToken, hotkey, detailed = false, ...props }) => {
  const engine = useEngine();
  const controllerEntityToken = useControllerEntityToken();
  const { targetToken: target, setTarget } = useTarget();
  const recommendedActions =
    controllerEntityToken.value &&
    recommendActions(engine, controllerEntityToken.value, entityToken.value);
  const targetThis = useCallback(() => {
    setTarget(entityToken.value);
  }, [entityToken, setTarget]);

  const panelRef = useHotkeyRef<HTMLDivElement>(hotkey);

  return (
    <Panel
      {...props}
      ref={panelRef}
      className={[
        props.className ?? "",
        "EntityPanel",
        entityToken.value.allegiance == null || entityToken.value.unconscious
          ? ""
          : entityToken.value.allegiance !==
            controllerEntityToken.value?.allegiance
          ? "hostile"
          : "friendly",
        entityToken === target ? "targetted" : "",
      ].join(" ")}
      onClick={targetThis}
    >
      <div>{entityToken.value.name}</div>
      <HPBar entityToken={entityToken} />
      <EPBar entityToken={entityToken} />
      {detailed && (
        <>
          <div className="ActionBar">
            {recommendedActions?.map((action) => (
              <ActionButton
                key={action}
                hotkey={
                  controllerEntityToken.value?.controller.hotkeyMap[action]
                }
                action={action}
                targetToken={entityToken}
              />
            ))}
          </div>
        </>
      )}
      {hotkey != null && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </Panel>
  );
});
