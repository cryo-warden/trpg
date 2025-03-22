import "./index.css";
import { WithEntity } from "../EntityComponent";
import { HPBar } from "./HPBar";
import { useWatchable } from "../../structural/useWatchable";
import { EPBar } from "./EPBar";
import { ActionButton } from "../ActionButton";
import { action } from "action-trpg-lib";
import { recommendActions } from "action-trpg-lib/src/structures/Action";
import { useMemo } from "react";

export const EntityDisplay = WithEntity<{ detailed?: boolean }>(
  ({ entity, detailed }) => {
    useWatchable(entity);
    const recommendedActions = useMemo(
      () => recommendActions(entity),
      [entity]
    );
    return (
      <div className="EntityDisplay">
        <div>{entity.name}</div>
        <HPBar entity={entity} />
        <EPBar entity={entity} />
        {detailed && <></>}
        {recommendedActions.map((action, i) => (
          <ActionButton key={i} action={action} target={entity}>
            {/* TODO Add name property to actions. */}
            {action.effectSequence[0].type}
          </ActionButton>
        ))}
      </div>
    );
  }
);
