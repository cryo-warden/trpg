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
  newPlayerBlob: blob({ name: { name: "unused" } }),
});

/** The smallest valid bundle: a single action and no world entities. */
export const minimalPack = (): AssetPack => ({
  ...emptyPack(),
  actions: [
    { id: ATTACK_ACTION_ID, name: "test_action", actionType: { tag: "Attack" } },
  ],
});

/**
 * A direct-seeded player world: a player entity owned by `playerIdentity`, in a
 * location, with hp — no new_player flow, no map generation, no production
 * assets. Because it carries no baseline, the stats system leaves its hp alone.
 */
export const playerPack = (playerIdentity: Identity): AssetPack => ({
  ...emptyPack(),
  instantiateEntityBlobs: [
    blob({
      playerController: { identity: playerIdentity },
      location: { locationEntityId: 999n },
      hp: {
        hp: 5,
        mhp: 5,
        defense: 0,
        accumulatedDamage: 0,
        accumulatedHealing: 0,
      },
    }),
  ],
});

/**
 * A direct-seeded world graph: two co-located occupants and a path entity
 * connecting their room to another. Exercises location/path components without
 * relying on the map generator.
 */
export const graphPack = (): AssetPack => ({
  ...emptyPack(),
  instantiateEntityBlobs: [
    blob({
      name: { name: "occupant_a" },
      location: { locationEntityId: 1n },
    }),
    blob({
      name: { name: "occupant_b" },
      location: { locationEntityId: 1n },
    }),
    blob({
      path: { destinationEntityId: 2n },
      location: { locationEntityId: 1n },
    }),
  ],
});

/**
 * A tiny map-generation world: the allegiance entities new_player requires,
 * a baseline, and a single small map with a fixed rng seed whose theme offers
 * one room/path/decoration blob. A fresh client is placed here through the real
 * new_player + map-generation flow, but on test assets rather than production
 * content.
 */
export const mapGenPack = (): AssetPack => ({
  ...emptyPack(),
  // A public action so tests can await "assets landed".
  actions: [
    { id: ATTACK_ACTION_ID, name: "test_action", actionType: { tag: "Move" } },
  ],
  baselines: [
    {
      id: 0,
      name: "test_human",
      statBlock: {
        attack: 1,
        mhp: 5,
        defense: 0,
        mep: 5,
        actionIds: [],
        appearanceFeatureIds: [],
      },
    },
  ],
  locationMapThemes: [
    {
      id: 0,
      // Nameless blobs: NameComponent.name is unique, so a generator that
      // stamps out many rooms/paths must not give them a fixed name.
      decorationsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
      minDecorationCount: 0,
      maxDecorationCount: 1,
      pathsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
      roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
    },
  ],
  locationMaps: [
    {
      id: 0,
      name: "tiny",
      themeId: 0,
      layout: { tag: "Path" },
      rngSeed: 0n,
      extraRoomCount: 0,
      mainRoomCount: 3,
      loopCount: 1,
      encounterIdsSampler: { selections: [] },
      minEncounterCount: 0,
      maxEncounterCount: 0,
    },
  ],
  // new_player resolves its starting allegiance by the name "allegiance1".
  instantiateEntityBlobs: [
    blob({ name: { name: "allegiance1" } }),
    blob({ name: { name: "allegiance2" } }),
  ],
  newPlayerBlob: blob({ baseline: { baselineId: 0 } }),
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
      playerController: { identity: playerIdentity },
      location: { locationEntityId: SHARED_LOCATION_ID },
      actions: { actionIds: [ATTACK_ACTION_ID] },
      allegiance: { allegianceEntityId: 100n },
    }),
    blob({
      enemyController: {},
      location: { locationEntityId: SHARED_LOCATION_ID },
      hp: {
        hp: enemyHp,
        mhp: enemyHp,
        defense: 0,
        accumulatedDamage: 0,
        accumulatedHealing: 0,
      },
      allegiance: { allegianceEntityId: 200n },
    }),
  ],
});
