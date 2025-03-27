import { recommendActions } from "action-trpg-lib/src/structures/Action";
import { Panel } from "../../structural/Panel";
import { useWatchable } from "../../structural/useWatchable";
import { ActionButton } from "../ActionButton";
import { useControllerEntity } from "../context/ControllerContext";
import { WithEntity } from "../EntityComponent";
import { EPBar } from "./EPBar";
import { HPBar } from "./HPBar";
import "./index.css";

export const EntityPanel = WithEntity<
  { detailed?: boolean } & Parameters<typeof Panel>[0]
>(({ entity, detailed = false, ...props }) => {
  useWatchable(entity);
  const controllerEntity = useControllerEntity();
  const recommendedActions =
    controllerEntity && recommendActions(controllerEntity, entity);

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
    >
      <div>{entity.name}</div>
      <HPBar entity={entity} />
      <EPBar entity={entity} />
      {detailed && (
        <>
          <div className="ActionBar">
            {recommendedActions?.map((action, i) => (
              <ActionButton
                key={i}
                hotkey={action.name === "Move" ? "m" : undefined}
                action={action}
                target={entity}
              />
            ))}
          </div>
        </>
      )}
    </Panel>
  );
});
