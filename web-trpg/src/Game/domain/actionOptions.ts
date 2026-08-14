import { ActionAsset } from "../../stdb/types";
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
  /** Resolves a runtime action id to its local asset (via the subscribed
   * actions table's id -> name mapping); null when unknown. */
  actionAssetOf: (actionId: ActionId) => ActionAsset | null;
  targetHasHp: boolean;
  targetHasPath: boolean;
  /** The target is an item entity (takeable/droppable gear). */
  targetHasItem: boolean;
  /** The target ENTITY (by id, never by name or look) is currently carried
   * by the player — its location is the player entity. Distinguishes drop
   * (carried) from take (beside you); identically named items are separate
   * entities and never confuse this. */
  targetCarriedByPlayer: boolean;
  /** This item INSTANCE currently counts as equipped/worn (the counted-
   * multiset rule decides which instances of an asset are "on").
   * Distinguishes unequip (equipped) from equip (pocketed). */
  targetIsEquipped: boolean;
  /** The target is attunable fortune-telling scenery (a checkpoint). */
  targetHasCheckpointObject: boolean;
  /** Quest-item freshness FOR THE VIEWER; null when not a quest item.
   * Only a fresh, carried quest item offers Eat — a stinky one (its bit
   * already held) never does. */
  targetQuestItemFreshness: "fresh" | "stinky" | null;
};

/** The subset of the player's actions that are valid against the target. */
export const getActionOptions = ({
  actionIds,
  actionAssetOf,
  targetHasHp,
  targetHasPath,
  targetHasItem,
  targetCarriedByPlayer,
  targetIsEquipped,
  targetHasCheckpointObject,
  targetQuestItemFreshness,
  ...allegiance
}: ActionOptionInputs): ActionId[] => {
  const ally = isAlly(allegiance);

  return actionIds.filter((id) => {
    const action = actionAssetOf(id);
    if (!action) return false;

    switch (action.actionType.tag) {
      case "Attack":
        return targetHasHp && !ally;
      case "Buff":
        return targetHasHp && ally;
      case "Move":
        return targetHasPath;
      // Take applies to items BESIDE you, drop to items you CARRY — decided
      // per entity id via containment, never by anything the item looks
      // like. Which verb an Inventory action is comes from its effects.
      case "Inventory": {
        if (!targetHasItem) return false;
        const effects = action.rounds.flatMap((round) => round.effects);
        if (effects.some((effect) => effect.tag === "Take")) {
          return !targetCarriedByPlayer;
        }
        if (effects.some((effect) => effect.tag === "Drop")) {
          return targetCarriedByPlayer;
        }
        return false;
      }
      // Equip targets a CARRIED, not-yet-equipped item; unequip a CARRIED,
      // equipped one. Which verb an Equip action is comes from its effects,
      // exactly like the Inventory verbs.
      case "Equip": {
        if (!targetHasItem || !targetCarriedByPlayer) return false;
        const effects = action.rounds.flatMap((round) => round.effects);
        if (effects.some((effect) => effect.tag === "Equip")) {
          return !targetIsEquipped;
        }
        if (effects.some((effect) => effect.tag === "Unequip")) {
          return targetIsEquipped;
        }
        return false;
      }
      // Only a FRESH, carried quest item is edible: a stinky one (the
      // viewer already holds its bit) never offers the action at all.
      case "Eat":
        return (
          targetHasItem &&
          targetCarriedByPlayer &&
          targetQuestItemFreshness === "fresh"
        );
      // Hit the deck where you stand, or dive at an item BESIDE you to
      // grab it (never one already carried).
      case "Dive":
        return (
          (targetHasItem && !targetCarriedByPlayer) ||
          allegiance.target === allegiance.playerEntity
        );
      case "Attune":
        return targetHasCheckpointObject;
      // Deliberate stance changes act on yourself alone.
      case "Posture":
        return allegiance.target === allegiance.playerEntity;
      default:
        return false;
    }
  });
};
