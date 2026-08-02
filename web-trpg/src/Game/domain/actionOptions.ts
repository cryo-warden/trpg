import { actions } from "../assets";
import { ActionId, EntityId } from "../trpg";

/**
 * Pure, framework-free client logic for deciding which actions a player may
 * take against a target. The React hooks in the UI (and any headless driver,
 * e.g. a CLI player) build these plain inputs from table snapshots and call
 * these functions, so the rules live in one testable place.
 */

export type AllegianceInputs = {
  playerEntity: EntityId | null;
  target: EntityId | null;
  playerAllegianceId: EntityId | null;
  targetAllegianceId: EntityId | null;
};

/** Self is always an ally; otherwise allies share a defined allegiance. */
export const isAlly = ({
  playerEntity,
  target,
  playerAllegianceId,
  targetAllegianceId,
}: AllegianceInputs): boolean =>
  playerEntity === target ||
  (playerAllegianceId != null &&
    targetAllegianceId != null &&
    playerAllegianceId === targetAllegianceId);

export type ActionOptionInputs = AllegianceInputs & {
  actionIds: ActionId[];
  targetHasHp: boolean;
  targetHasPath: boolean;
};

/** The subset of the player's actions that are valid against the target. */
export const getActionOptions = ({
  actionIds,
  targetHasHp,
  targetHasPath,
  ...allegiance
}: ActionOptionInputs): ActionId[] => {
  const ally = isAlly(allegiance);

  return actionIds.filter((id) => {
    const action = actions[id];
    if (!action) return false;

    switch (action.type) {
      case "Attack":
        return targetHasHp && !ally;
      case "Buff":
        return targetHasHp && ally;
      case "Move":
        return targetHasPath;
      default:
        return false;
    }
  });
};
