import { ActionAsset } from "../../stdb/types";
import { ActionId, EntityId } from "../trpg";
import { IntStats, meetsRequirements } from "./statSummary";

/** The special-action registry roles (see assetLookup.useSpecialActionIds):
 * null roles never derive an offer. */
export type SpecialActionIdsInput = {
  take: ActionId | null;
  drop: ActionId | null;
  equip: ActionId | null;
  unequip: ActionId | null;
  eat: ActionId | null;
};

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
  /** Actions the TARGET itself offers (its offered_actions component):
   * context-sensitive interactions — opening a chest, dumping a sack —
   * available to any actor beside it, known or not. */
  targetOfferedActionIds: ActionId[];
  /** The target stands in the player's room (offered actions reach no
   * further than arm's length). */
  targetCoLocatedWithPlayer: boolean;
  /** The derived item verbs: take/drop/equip/unequip/eat are OFFERS
   * computed from the target's components against this registry — no
   * actor knows them innately. */
  specialActionIds: SpecialActionIdsInput;
  /** The target is takeable from here: in the player's room, or inside
   * an OPEN container standing in it (never something already carried). */
  targetWithinTakeReach: boolean;
  /** The player's total stats, for the requirements mirror on offered
   * and derived options (the server enforces the same gate at act time).
   * Null reads as all-zero. */
  actorStats: IntStats | null;
};

/** The player's actions valid against the target, plus whatever the
 * target offers: authored offers (its offered_actions component) and the
 * DERIVED item verbs (take/drop/equip/unequip/eat, computed from the
 * target's components against the special-action registry). Offers come
 * from the OBJECT — the player needs no knowledge of them — but the
 * actor-side requirements gate mirrors the server's act-time check. */
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
  targetOfferedActionIds,
  targetCoLocatedWithPlayer,
  specialActionIds,
  targetWithinTakeReach,
  actorStats,
  ...allegiance
}: ActionOptionInputs): ActionId[] => {
  const ally = isAlly(allegiance);

  // The derived offers: which item verbs THIS target extends to the
  // player right now. The same predicates the server's targeting arms
  // validate — duplicated here on purpose, so options and act agree.
  const derived: (ActionId | null)[] = [];
  if (targetHasItem) {
    const carriedGear =
      targetCarriedByPlayer && targetQuestItemFreshness == null;
    if (!targetCarriedByPlayer && targetWithinTakeReach) {
      derived.push(specialActionIds.take);
    }
    if (targetCarriedByPlayer) {
      derived.push(specialActionIds.drop);
    }
    if (carriedGear) {
      derived.push(
        targetIsEquipped ? specialActionIds.unequip : specialActionIds.equip,
      );
    }
    if (targetCarriedByPlayer && targetQuestItemFreshness === "fresh") {
      derived.push(specialActionIds.eat);
    }
  }
  const derivedSet = new Set(
    derived.filter((id): id is ActionId => id != null),
  );

  const candidates = [
    ...actionIds,
    ...[...new Set([...targetOfferedActionIds, ...derivedSet])].filter(
      (id) => !actionIds.includes(id),
    ),
  ];
  return candidates.filter((id) => {
    const action = actionAssetOf(id);
    if (!action) return false;
    if (!actionIds.includes(id)) {
      // An offer the actor cannot meet never shows (the server refuses
      // it at act time with the same rule).
      if (!meetsRequirements(actorStats, action.requirements)) {
        return false;
      }
      // A derived offer's predicate already held above.
      if (derivedSet.has(id)) {
        return true;
      }
      // Otherwise the id is a candidate only as the target's AUTHORED
      // offer, and those carry Interact actions — or MOVE verbs, which
      // paths offer (squeeze, climb down, plain move). Anything else in
      // an offered list never leaks in.
      if (
        action.actionType.tag !== "Interact" &&
        action.actionType.tag !== "Move"
      ) {
        return false;
      }
      if (action.actionType.tag === "Move") {
        return (
          targetHasPath &&
          targetOfferedActionIds.includes(id) &&
          targetCoLocatedWithPlayer
        );
      }
    }

    switch (action.actionType.tag) {
      case "Attack":
        return targetHasHp && !ally;
      case "Buff":
        return targetHasHp && ally;
      // Even a KNOWN move verb crosses only paths that OFFER it.
      case "Move":
        return (
          targetHasPath &&
          targetOfferedActionIds.includes(id) &&
          targetCoLocatedWithPlayer
        );
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
      // exactly like the Inventory verbs. Quest items are food, never gear:
      // they must not offer equip.
      case "Equip": {
        if (!targetHasItem || !targetCarriedByPlayer) return false;
        if (targetQuestItemFreshness != null) return false;
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
      // Offered BY the target: valid only while the target lists this
      // very action and stands within reach.
      case "Interact":
        return (
          targetOfferedActionIds.includes(id) && targetCoLocatedWithPlayer
        );
      default:
        return false;
    }
  });
};
