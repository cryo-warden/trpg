import { ComponentPropsWithRef } from "react";
import { Button } from "../structural/Button";
import { Panel } from "../structural/Panel";
import { useStanceRows } from "./context/StdbContext/assetLookup";
import {
  useMyActiveStanceId,
  useMyKnownStanceIds,
} from "./context/StdbContext/components";
import { useStdbConnection } from "./context/StdbContext/useStdb";

/**
 * The stance switcher: the stances the player KNOWS (granted by body,
 * traits, and later quest rewards), with the active one highlighted.
 * Swapping is validated server-side against the stance's requirements (and
 * is instant for now; the one-round swap cost arrives with prepared
 * loadouts).
 */
export const StancePanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const connection = useStdbConnection();
  const stances = useStanceRows();
  const knownStanceIds = new Set(useMyKnownStanceIds());
  const activeStanceId = useMyActiveStanceId();

  return (
    <Panel {...props}>
      <div className="Stances">
        {stances
          .filter(({ id }) => knownStanceIds.has(id))
          .map(({ id, name }) => (
          <Button
            key={id}
            className={[
              "StanceButton",
              id === activeStanceId ? "active" : "",
            ].join(" ")}
            onClick={() => connection.reducers.setStance({ stanceId: id })}
          >
            {name}
          </Button>
          ))}
      </div>
    </Panel>
  );
};
