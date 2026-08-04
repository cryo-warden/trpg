import type { Identity } from "spacetimedb";
import type { AssetPack, EntityBlob } from "../src/stdb/types";

/**
 * Test-specific asset bundles for E2E scenarios — deliberately tiny and
 * independent of the production assets. Entity blobs carry only the components a
 * scenario needs (absent option components serialize as None, exactly as the
 * app's getEntityBlob relies on), so we can seed fully-formed world entities
 * (players, enemies) directly rather than going through map generation.
 */

const blob = (partial: Partial<EntityBlob>): EntityBlob => partial as EntityBlob;

export const ATTACK_ACTION_ID = 0;

/** A location id both fighters share. Co-location compares these values, so it
 * need not correspond to a real room entity. */
const SHARED_LOCATION_ID = 999n;

const emptyPack = (): AssetPack => ({
  actions: [],
  actionSteps: [],
  appearanceFeatures: [],
  baselines: [],
  traits: [],
  encounterBlobs: [],
  encounters: [],
  locationMapThemes: [],
  locationMaps: [],
  locationMapConnections: [],
  instantiateEntityBlobs: [],
  // Never instantiated in these scenarios (no client triggers new_player), but
  // AssetPack requires one; a name-only blob is a valid placeholder.
  newPlayerBlob: blob({ name: { entityId: 0n, name: "unused" } }),
});

/** The smallest valid bundle: a single action and no world entities. */
export const minimalPack = (): AssetPack => ({
  ...emptyPack(),
  actions: [
    { id: ATTACK_ACTION_ID, name: "test_action", actionType: { tag: "Attack" } },
  ],
});

/**
 * A minimal combat world: one attack action, a player owned by `playerIdentity`,
 * and a co-located hostile enemy with hp. Neither fighter has a baseline, so the
 * stats system leaves their seeded hp alone (only damage changes it).
 */
export const combatPack = (
  playerIdentity: Identity,
  { attackDamage = 3, enemyHp = 10 }: { attackDamage?: number; enemyHp?: number } = {},
): AssetPack => ({
  ...emptyPack(),
  actions: [
    { id: ATTACK_ACTION_ID, name: "test_attack", actionType: { tag: "Attack" } },
  ],
  actionSteps: [
    {
      id: 1n,
      actionId: ATTACK_ACTION_ID,
      sequenceIndex: 0,
      actionEffect: { tag: "Attack", value: attackDamage },
    },
  ],
  instantiateEntityBlobs: [
    blob({
      playerController: { entityId: 0n, identity: playerIdentity },
      location: { entityId: 0n, locationEntityId: SHARED_LOCATION_ID },
      actions: { entityId: 0n, actionIds: [ATTACK_ACTION_ID] },
      allegiance: { entityId: 0n, allegianceEntityId: 100n },
    }),
    blob({
      enemyController: { entityId: 0n },
      location: { entityId: 0n, locationEntityId: SHARED_LOCATION_ID },
      hp: {
        entityId: 0n,
        hp: enemyHp,
        mhp: enemyHp,
        defense: 0,
        accumulatedDamage: 0,
        accumulatedHealing: 0,
      },
      allegiance: { entityId: 0n, allegianceEntityId: 200n },
    }),
  ],
});
