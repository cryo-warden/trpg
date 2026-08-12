import type { AssetPack, EntityBlobAuthor } from "../src/stdb/types";

/**
 * Test-specific asset bundles for E2E scenarios — deliberately tiny and
 * independent of the production assets. Entity blob authors carry only the
 * components a scenario needs (absent option components serialize as None),
 * so we can seed fully-formed world entities (players, enemies) directly
 * rather than going through map generation. All references are by name; runtime
 * ids come only from the subscribed tables.
 */

const blob = (partial: Partial<EntityBlobAuthor>): EntityBlobAuthor =>
  partial as EntityBlobAuthor;

/** A location id both fighters share. Co-location compares these values, so it
 * need not correspond to a real room entity. */
const SHARED_LOCATION_ID = 999n;

const emptyPack = (): AssetPack => ({
  actions: [],
  appearanceFeatures: [],
  baselines: [],
  traits: [],
  encounterBlobs: [],
  encounters: [],
  locationMapThemes: [],
  locationMaps: [],
  namedInstantiateEntityBlobs: [],
  instantiateEntityBlobs: [],
  // An empty blob: accounts created against this pack get a bare player
  // entity. Deliberately nameless — names are unique, and any number of
  // accounts may be created.
  newPlayerBlob: blob({}),
});

/** The smallest valid bundle: a single action and no world entities. */
export const minimalPack = (): AssetPack => ({
  ...emptyPack(),
  actions: [
    {
      name: "test_action",
      value: { actionType: { tag: "Attack" }, rounds: [] },
    },
  ],
});

/**
 * A player world under the accounts model: the player entity is created by
 * create_account from this new-player blob (a located, hp-carrying body — no
 * baseline, so the stats system leaves its hp alone). No map generation, no
 * production assets.
 */
export const playerPack = (): AssetPack => ({
  ...emptyPack(),
  newPlayerBlob: blob({
    location: { locationEntityId: { tag: "Literal", value: 999n } },
    hp: {
      hp: 5,
      mhp: 5,
      defense: 0,
      accumulatedDamage: 0,
      accumulatedHealing: 0,
    },
  }),
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
      location: { locationEntityId: { tag: "Literal", value: 1n } },
    }),
    blob({
      name: { name: "occupant_b" },
      location: { locationEntityId: { tag: "Literal", value: 1n } },
    }),
    blob({
      path: { destinationEntityId: { tag: "Literal", value: 2n } },
      location: { locationEntityId: { tag: "Literal", value: 1n } },
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
    { name: "test_action", value: { actionType: { tag: "Move" }, rounds: [] } },
  ],
  baselines: [
    {
      name: "test_human",
      value: {
        attack: 1,
        mhp: 5,
        defense: 0,
        mep: 5,
        actionNames: [],
        appearanceFeatureNames: [],
      },
    },
  ],
  locationMapThemes: [
    {
      name: "test_theme",
      value: {
        // Nameless blobs: NameComponent.name is unique, so a generator that
        // stamps out many rooms/paths must not give them a fixed name.
        decorationsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        minDecorationCount: 0,
        maxDecorationCount: 1,
        pathsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
      },
    },
  ],
  locationMaps: [
    {
      name: "tiny",
      value: {
        themeName: "test_theme",
        layout: { tag: "Path" },
        rngSeed: 0n,
        extraRoomCount: 0,
        mainRoomCount: 3,
        loopCount: 1,
        encounterNamesSampler: [],
        minEncounterCount: 0,
        maxEncounterCount: 0,
        connectionNames: [],
      },
    },
  ],
  // new_player's blob resolves its starting allegiance through the registry
  // by the name "allegiance1", so the allegiance entities are named blobs.
  namedInstantiateEntityBlobs: [
    { name: "allegiance1", value: blob({}) },
    { name: "allegiance2", value: blob({}) },
  ],
  newPlayerBlob: blob({
    baselineName: "test_human",
    allegiance: { allegianceEntityId: { tag: "Named", value: "allegiance1" } },
  }),
});

/**
 * A minimal combat world: one attack action, a new-player blob for the
 * account the test creates, and a co-located hostile enemy with hp. Neither
 * fighter has a baseline, so the stats system leaves their seeded hp alone
 * (only damage changes it).
 */
export const combatPack = ({
  attackDamage = 3,
  enemyHp = 10,
}: { attackDamage?: number; enemyHp?: number } = {}): AssetPack => ({
  ...emptyPack(),
  actions: [
    {
      name: "test_attack",
      value: {
        actionType: { tag: "Attack" },
        rounds: [{ effects: [{ tag: "Attack", value: attackDamage }] }],
      },
    },
  ],
  newPlayerBlob: blob({
    location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    actionNames: ["test_attack"],
    allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
  }),
  instantiateEntityBlobs: [
    blob({
      enemyController: {},
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
      hp: {
        hp: enemyHp,
        mhp: enemyHp,
        defense: 0,
        accumulatedDamage: 0,
        accumulatedHealing: 0,
      },
      allegiance: { allegianceEntityId: { tag: "Literal", value: 200n } },
    }),
  ],
});
