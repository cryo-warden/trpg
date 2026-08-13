import type { AssetPack, EntityBlobAsset } from "../src/stdb/types";
import {
  NO_REQUIREMENTS,
  requirements,
} from "../src/Game/assets/stat_requirements";
import { statBlock } from "../src/Game/assets/stat_block";

/**
 * Test-specific asset bundles for E2E scenarios — deliberately tiny and
 * independent of the production assets. Entity blob authors carry only the
 * components a scenario needs (absent option components serialize as None),
 * so we can seed fully-formed world entities (players, enemies) directly
 * rather than going through map generation. All references are by name; runtime
 * ids come only from the subscribed tables.
 */

const blob = (partial: Partial<EntityBlobAsset>): EntityBlobAsset =>
  partial as EntityBlobAsset;

/** A location id both fighters share. Co-location compares these values, so it
 * need not correspond to a real room entity. */
const SHARED_LOCATION_ID = 999n;

const emptyPack = (): AssetPack => ({
  actions: [],
  appearanceFeatures: [],
  baselines: [],
  traits: [],
  armaments: [],
  armors: [],
  relics: [],
  stances: [],
  coweringStanceName: undefined,
  proneStanceName: undefined,
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
      value: {
        actionType: { tag: "Attack" },
        requirements: NO_REQUIREMENTS,
        rounds: [],
      },
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
    {
      name: "test_action",
      value: {
        actionType: { tag: "Move" },
        requirements: NO_REQUIREMENTS,
        rounds: [],
      },
    },
  ],
  baselines: [
    {
      name: "test_human",
      value: statBlock({ attack: 1, mhp: 5, mep: 5 }),
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
        checkpointsSelector: {
          selections: [{ weight: 1, blob: blob({ checkpointObject: {} }) }],
        },
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
 * A stance world: a body baseline providing hand/gait, actions gated on
 * those properties, and three stances — the default, a prone-like stance
 * whose gait penalty starves the movement action out of the derived set, and
 * one whose requirements no human body can meet.
 */
export const stancePack = (): AssetPack => ({
  ...emptyPack(),
  actions: [
    {
      name: "test_punch",
      value: {
        actionType: { tag: "Attack" },
        requirements: requirements({ hand: 1 }),
        rounds: [{ effects: [{ tag: "Attack", value: 1 }], interruptible: false }],
      },
    },
    {
      name: "test_shuffle",
      value: {
        actionType: { tag: "Move" },
        requirements: requirements({ gait: 1 }),
        rounds: [{ effects: [{ tag: "Move" }], interruptible: false }],
      },
    },
  ],
  baselines: [
    {
      name: "test_human",
      value: statBlock({
        mhp: 5,
        hand: 2,
        gait: 2,
        actionNames: ["test_punch", "test_shuffle"],
        stanceNames: ["test_brawler", "test_prone", "test_four_arms"],
      }),
    },
  ],
  stances: [
    {
      name: "test_brawler",
      value: {
        requirements: requirements({ hand: 1 }),
        statBlock: statBlock({}),
      },
    },
    {
      name: "test_prone",
      value: {
        requirements: NO_REQUIREMENTS,
        statBlock: statBlock({ gait: -2 }),
      },
    },
    {
      name: "test_four_arms",
      value: {
        requirements: requirements({ hand: 4 }),
        statBlock: statBlock({}),
      },
    },
  ],
  newPlayerBlob: blob({
    baselineName: "test_human",
    stanceName: "test_brawler",
    location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
  }),
});

/**
 * A loadout world: a body with hands, take/drop plus a sword attack, a
 * dueling-like stance requiring a blade, and REAL item entities lying in the
 * shared room — a sword to take and assign, armor and a relic to wear.
 */
export const loadoutPack = (): AssetPack => ({
  ...emptyPack(),
  actions: [
    {
      name: "test_take",
      value: {
        actionType: { tag: "Inventory" },
        requirements: requirements({ hand: 1 }),
        rounds: [{ effects: [{ tag: "Take" }], interruptible: false }],
      },
    },
    {
      name: "test_slash",
      value: {
        actionType: { tag: "Attack" },
        requirements: requirements({ bladed: 1 }),
        rounds: [{ effects: [{ tag: "Attack", value: 2 }], interruptible: false }],
      },
    },
  ],
  baselines: [
    {
      name: "test_human",
      value: statBlock({
        mhp: 5,
        hand: 2,
        gait: 2,
        actionNames: ["test_take", "test_slash"],
        stanceNames: ["test_standing", "test_dueling"],
      }),
    },
  ],
  armaments: [
    {
      name: "test_sword",
      value: statBlock({ bladed: 1, hand: -1 }),
    },
  ],
  armors: [{ name: "test_jerkin", value: statBlock({ defense: 1 }) }],
  relics: [{ name: "test_charm", value: statBlock({ attack: 1 }) }],
  stances: [
    {
      name: "test_standing",
      value: { requirements: NO_REQUIREMENTS, statBlock: statBlock({}) },
    },
    {
      name: "test_dueling",
      value: {
        requirements: requirements({ bladed: 1 }),
        statBlock: statBlock({ attack: 1 }),
      },
    },
  ],
  newPlayerBlob: blob({
    baselineName: "test_human",
    stanceName: "test_standing",
    location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
  }),
  instantiateEntityBlobs: [
    blob({
      item: { tag: "Armament", value: "test_sword" },
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    }),
    blob({
      item: { tag: "Armor", value: "test_jerkin" },
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    }),
    blob({
      item: { tag: "Relic", value: "test_charm" },
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    }),
  ],
});

/**
 * A morale world: a small player (the mouse) shares a room with a huge
 * attacking enemy (the giant). Every round of the giant's attack carries the
 * implicit size-delta intimidation plus an authored bonus — enough to break
 * the mouse into the registered cowering stance. The cower grants rally
 * (EP -> morale), a path leads to safety, and standing back up is gated on
 * nerve beating the looming pressure.
 */
export const moralePack = (): AssetPack => ({
  ...emptyPack(),
  actions: [
    {
      name: "test_smash",
      value: {
        actionType: { tag: "Attack" },
        requirements: NO_REQUIREMENTS,
        rounds: [
          {
            effects: [
              { tag: "Attack", value: 1 },
              { tag: "Intimidate", value: 3 },
            ],
            interruptible: false,
          },
        ],
      },
    },
    {
      name: "test_rally",
      value: {
        actionType: { tag: "Buff" },
        requirements: NO_REQUIREMENTS,
        rounds: [
          { effects: [{ tag: "Rally" }], interruptible: false },
        ],
      },
    },
    {
      name: "test_move",
      value: {
        actionType: { tag: "Move" },
        requirements: requirements({ gait: 1 }),
        rounds: [{ effects: [{ tag: "Move" }], interruptible: false }],
      },
    },
  ],
  stances: [
    {
      name: "test_standing",
      value: { requirements: NO_REQUIREMENTS, statBlock: statBlock({}) },
    },
    {
      name: "test_cowering",
      value: {
        requirements: NO_REQUIREMENTS,
        statBlock: statBlock({ actionNames: ["test_rally"] }),
      },
    },
  ],
  coweringStanceName: "test_cowering",
  baselines: [
    {
      name: "test_mouse",
      value: statBlock({
        mhp: 12,
        mep: 5,
        gait: 2,
        size: 2,
        morale: 5,
        actionNames: ["test_move"],
        stanceNames: ["test_standing"],
      }),
    },
    {
      name: "test_giant",
      value: statBlock({
        mhp: 20,
        size: 6,
        actionNames: ["test_smash"],
      }),
    },
  ],
  newPlayerBlob: blob({
    baselineName: "test_mouse",
    stanceName: "test_standing",
    location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
  }),
  instantiateEntityBlobs: [
    blob({
      enemyController: {},
      baselineName: "test_giant",
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
      allegiance: { allegianceEntityId: { tag: "Literal", value: 200n } },
    }),
    blob({
      path: { destinationEntityId: { tag: "Literal", value: 1000n } },
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    }),
  ],
});

/**
 * A death world: a hero, bone dice to attune to in the safe room, a lethal
 * brute one room over, and a fragile vermin to corpse-test. Death wakes the
 * hero at the attuned checkpoint, fully restored; a dead NPC is deleted
 * outright (its carried items would spill).
 */
export const deathPack = (): AssetPack => ({
  ...emptyPack(),
  // The haven: a map that is NEVER generated up front. The seeded bone dice
  // bind to it abstractly; the first death cashes the binding in, forcing
  // fluent on-demand generation before the wake.
  locationMapThemes: [
    {
      name: "test_haven_theme",
      value: {
        decorationsSelector: { selections: [] },
        minDecorationCount: 0,
        maxDecorationCount: 0,
        pathsSelector: { selections: [] },
        roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        checkpointsSelector: {
          selections: [{ weight: 1, blob: blob({ checkpointObject: {} }) }],
        },
      },
    },
  ],
  locationMaps: [
    {
      name: "test_haven",
      value: {
        themeName: "test_haven_theme",
        layout: { tag: "Path" },
        rngSeed: 0n,
        mainRoomCount: 1,
        extraRoomCount: 0,
        loopCount: 0,
        encounterNamesSampler: [],
        minEncounterCount: 0,
        maxEncounterCount: 0,
        connectionNames: [],
      },
    },
  ],
  actions: [
    {
      name: "test_attune",
      value: {
        actionType: { tag: "Attune" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Attune" }], interruptible: false }],
      },
    },
    {
      name: "test_move",
      value: {
        actionType: { tag: "Move" },
        requirements: requirements({ gait: 1 }),
        rounds: [{ effects: [{ tag: "Move" }], interruptible: false }],
      },
    },
    {
      name: "test_jab",
      value: {
        actionType: { tag: "Attack" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Attack", value: 5 }], interruptible: false }],
      },
    },
    {
      name: "test_crush",
      value: {
        actionType: { tag: "Attack" },
        requirements: NO_REQUIREMENTS,
        rounds: [
          { effects: [{ tag: "Attack", value: 99 }], interruptible: false },
        ],
      },
    },
  ],
  baselines: [
    {
      name: "test_hero",
      value: statBlock({
        mhp: 10,
        mep: 4,
        gait: 2,
        actionNames: ["test_attune", "test_move", "test_jab"],
      }),
    },
    {
      name: "test_brute",
      value: statBlock({ mhp: 30, actionNames: ["test_crush"] }),
    },
    {
      name: "test_vermin",
      value: statBlock({ mhp: 2 }),
    },
  ],
  newPlayerBlob: blob({
    baselineName: "test_hero",
    location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
  }),
  instantiateEntityBlobs: [
    blob({
      checkpointObject: {},
      checkpointBinding: { locationMapName: "test_haven", checkpointIndex: 0 },
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    }),
    blob({
      path: { destinationEntityId: { tag: "Literal", value: 1000n } },
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    }),
    blob({
      enemyController: {},
      baselineName: "test_brute",
      location: { locationEntityId: { tag: "Literal", value: 1000n } },
      allegiance: { allegianceEntityId: { tag: "Literal", value: 200n } },
    }),
    blob({
      enemyController: {},
      baselineName: "test_vermin",
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
      allegiance: { allegianceEntityId: { tag: "Literal", value: 200n } },
    }),
  ],
});

/**
 * A dive world: a standing player, a brave sword (morale +3) lying in the
 * room, and the prone stance registered as the dive landing. Diving at the
 * sword lands prone + braced, grabs AND wields it in one motion — and the
 * wielded morale flows through the stat pipeline.
 */
export const divePack = (): AssetPack => ({
  ...emptyPack(),
  actions: [
    {
      name: "test_dive",
      value: {
        actionType: { tag: "Dive" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Dive", value: 2 }], interruptible: false }],
      },
    },
  ],
  armaments: [
    {
      name: "test_brave_sword",
      value: statBlock({ bladed: 1, hand: -1, morale: 3 }),
    },
  ],
  stances: [
    {
      name: "test_standing",
      value: {
        requirements: NO_REQUIREMENTS,
        statBlock: statBlock({ actionNames: ["test_dive"] }),
      },
    },
    {
      name: "test_prone",
      value: {
        requirements: NO_REQUIREMENTS,
        statBlock: statBlock({ gait: -2 }),
      },
    },
  ],
  proneStanceName: "test_prone",
  baselines: [
    {
      name: "test_human",
      value: statBlock({
        mhp: 8,
        hand: 2,
        gait: 2,
        morale: 5,
        stanceNames: ["test_standing", "test_prone"],
      }),
    },
  ],
  newPlayerBlob: blob({
    baselineName: "test_human",
    stanceName: "test_standing",
    location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
  }),
  instantiateEntityBlobs: [
    blob({
      item: { tag: "Armament", value: "test_brave_sword" },
      location: { locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID } },
    }),
  ],
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
        requirements: NO_REQUIREMENTS,
        rounds: [
          {
            effects: [{ tag: "Attack", value: attackDamage }],
            interruptible: false,
          },
        ],
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
