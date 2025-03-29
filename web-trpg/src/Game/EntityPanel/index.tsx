import { recommendActions } from "action-trpg-lib/src/structures/Action";
import { useCallback } from "react";
import { Panel } from "../../structural/Panel";
import { useHotkey } from "../../structural/useHotkey";
import { useWatchable } from "../../structural/useWatchable";
import { ActionButton } from "../ActionButton";
import { useControllerEntity } from "../context/ControllerContext";
import { useTarget } from "../context/TargetContext";
import { WithEntity } from "../EntityComponent";
import { EPBar } from "./EPBar";
import { HPBar } from "./HPBar";
import "./index.css";

export const EntityPanel = WithEntity<
  { hotkey?: string; detailed?: boolean } & Parameters<typeof Panel>[0]
>(({ entity, hotkey, detailed = false, ...props }) => {
  useWatchable(entity);
  const controllerEntity = useControllerEntity();
  const { setTarget } = useTarget();
  const recommendedActions =
    controllerEntity && recommendActions(controllerEntity, entity);
  const targetThis = useCallback(() => {
    setTarget(entity);
  }, [entity, setTarget]);

  useHotkey(hotkey, targetThis);

  return (
    <Panel
      {...props}
      className={
        (props.className ?? "") +
        " EntityPanel " +
        (entity.allegiance == null || entity.unconscious
          ? ""
          : entity.allegiance !== controllerEntity?.allegiance
          ? "hostile"
          : "friendly")
      }
      onClick={targetThis}
    >
      <div>{entity.name}</div>
      <HPBar entity={entity} />
      <EPBar entity={entity} />
      {detailed && (
        <>
          <div className="ActionBar">
            {recommendedActions?.map((action) => (
              <ActionButton
                key={action.name}
                hotkey={controllerEntity?.controller.hotkeyMap[action.name]}
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
});
