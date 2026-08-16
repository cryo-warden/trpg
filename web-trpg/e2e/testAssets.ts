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

/** A posture action: one round spent adopting the named stance. Stances
 * have no "known" state, so every stance a test adopts or probes needs
 * one of these making it REACHABLE. */
const postureAction = (name: string, stanceName: string) => ({
  name,
  value: {
    actionType: { tag: "Posture" } as const,
    requirements: NO_REQUIREMENTS,
    rounds: [
      {
        effects: [{ tag: "SetStance", value: stanceName } as const],
        interruptible: false,
      },
    ],
  },
});

const emptyPack = (): AssetPack => ({
  actions: [],
  appearanceFeatures: [],
  baselines: [],
  traits: [],
  traitPalettes: [],
  armaments: [],
  armors: [],
  relics: [],
  stances: [],
  quests: [],
  coweringStanceName: undefined,
  proneStanceName: undefined,
  takeActionName: undefined,
  dropActionName: undefined,
  equipActionName: undefined,
  unequipActionName: undefined,
  eatActionName: undefined,
  rearmActionName: undefined,
  moveActionName: undefined,
  encounterBlobs: [],
  encounters: [],
  locationMapThemes: [],
  locationMaps: [],
  connections: [],
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
    location: {
      locationEntityId: { tag: "Literal", value: 999n },
      kind: { tag: "Interior" },
    },
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
      location: {
        locationEntityId: { tag: "Literal", value: 1n },
        kind: { tag: "Interior" },
      },
    }),
    blob({
      name: { name: "occupant_b" },
      location: {
        locationEntityId: { tag: "Literal", value: 1n },
        kind: { tag: "Interior" },
      },
    }),
    blob({
      path: {
        destinationEntityId: { tag: "Literal", value: 2n },
        destinationKind: { tag: "Interior" },
      },
      location: {
        locationEntityId: { tag: "Literal", value: 1n },
        kind: { tag: "Interior" },
      },
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
  appearanceFeatures: [
    {
      name: "test_winding",
      value: {
        text: "winding",
        appearanceFeatureType: { tag: "Adjective" },
        priority: 1000,
        exclusionGroup: undefined,
      },
    },
    { name: "test_v1_mark", value: { text: "v1", appearanceFeatureType: { tag: "Adjective" }, priority: 1000, exclusionGroup: undefined } },
    { name: "test_v2_mark", value: { text: "v2", appearanceFeatureType: { tag: "Adjective" }, priority: 1000, exclusionGroup: undefined } },
    { name: "test_v3_mark", value: { text: "v3", appearanceFeatureType: { tag: "Adjective" }, priority: 1000, exclusionGroup: undefined } },
    { name: "test_deco_mark", value: { text: "deco", appearanceFeatureType: { tag: "Noun" }, priority: 5000, exclusionGroup: undefined } },
  ],
  // A differentiable pack: three creatures sharing a palette of three distinct
  // variety traits, forced to exactly one each — so the pack must come out with
  // three DISTINCT marks (the distinct-across-pack draw).
  traits: [
    { name: "test_v1", value: statBlock({ appearanceFeatureNames: ["test_v1_mark"] }) },
    { name: "test_v2", value: statBlock({ appearanceFeatureNames: ["test_v2_mark"] }) },
    { name: "test_v3", value: statBlock({ appearanceFeatureNames: ["test_v3_mark"] }) },
  ],
  traitPalettes: [
    {
      name: "test_variety",
      value: {
        traitNames: ["test_v1", "test_v2", "test_v3"],
        countWeights: new Uint8Array([0, 1]),
      },
    },
  ],
  encounterBlobs: [
    {
      name: "test_pack_categoric",
      value: blob({
        enemyController: {},
        appliesStatBlock: {},
        differentiable: { traitPaletteName: "test_variety" },
      }),
    },
    { name: "test_creature", value: blob({ baselineName: "test_human" }) },
  ],
  encounters: [
    {
      name: "test_pack",
      value: {
        categoricBlobName: "test_pack_categoric",
        blobNames: ["test_creature", "test_creature", "test_creature"],
      },
    },
  ],
  locationMapThemes: [
    {
      name: "test_theme",
      value: {
        // Nameless blobs: NameComponent.name is unique, so a generator that
        // stamps out many rooms/paths must not give them a fixed name.
        // A differentiable ITEM decoration (unflagged): the stat pipeline
        // never runs for it, so apply_variety must MERGE a variety feature
        // straight onto its appearance.
        decorationsSelector: {
          selections: [
            {
              weight: 1,
              blob: blob({
                appearanceFeatureNames: ["test_deco_mark"],
                differentiable: { traitPaletteName: "test_variety" },
              }),
            },
          ],
        },
        minDecorationCount: 1,
        maxDecorationCount: 2,
        // Paths OFFER their crossing verb; no body knows moves innately.
        // Both directions of a generated pair are ONE authored fact.
        pathsSelector: {
          selections: [
            {
              weight: 1,
              pair: {
                forward: blob({ offeredActionNames: ["test_action"] }),
                backward: blob({ offeredActionNames: ["test_action"] }),
              },
            },
          ],
        },
        roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        checkpointsSelector: {
          selections: [{ weight: 1, blob: blob({ checkpointObject: {} }) }],
        },
        containersSelector: { selections: [] },
        minContainerCount: 0,
        maxContainerCount: 0,
        blockersSelector: { selections: [] },
        // Force exactly one variation onto every generated path so the test
        // can assert the merge landed.
        pathVariationNames: ["test_winding"],
        pathVariationCountWeights: new Uint8Array([0, 1]),
      },
    },
  ],
  locationMaps: [
    {
      name: "tiny",
      value: {
        themeName: "test_theme",
        layout: { tag: "Path" },
        zoneKind: { tag: "Private" },
        rngSeed: 0n,
        extraRoomCount: 0,
        mainRoomCount: 3,
        loopCount: 1,
        encounterNamesSampler: [{ weight: 1, name: "test_pack" }],
        minEncounterCount: 1,
        maxEncounterCount: 2,
        minHiddenRoomCount: 0,
        maxHiddenRoomCount: 0,
        questSpawns: [],
        questRoomClaims: [],
        roomLocation: undefined,
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
    appliesStatBlock: {},
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
    postureAction("test_lie", "test_prone"),
    postureAction("test_square", "test_brawler"),
    postureAction("test_reach_wide", "test_four_arms"),
  ],
  baselines: [
    {
      name: "test_human",
      value: statBlock({
        mhp: 5,
        hand: 2,
        gait: 2,
        actionNames: [
          "test_punch",
          "test_shuffle",
          "test_lie",
          "test_square",
          "test_reach_wide",
        ],
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
        // The mep grant exercises the max-pool RATCHET: adopting prone
        // raises mep once; leaving never lowers it back.
        statBlock: statBlock({ gait: -2, mep: 3 }),
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
    appliesStatBlock: {},
    baselineName: "test_human",
    stanceName: "test_brawler",
    location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
  }),
});

/**
 * A loadout world: a body with hands, take/drop plus a sword attack, a
 * dueling-like stance requiring a blade, and REAL item entities lying in the
 * shared room — a sword to take and assign, armor and a relic to wear.
 */
export const loadoutPack = (): AssetPack => ({
  ...emptyPack(),
  // Menu-driven configuration changes converge through the forced
  // re-arm round; without this registration they would never land.
  rearmActionName: "test_rearm",
  actions: [
    {
      name: "test_take",
      value: {
        actionType: { tag: "Inventory" },
        requirements: NO_REQUIREMENTS,
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
    {
      name: "test_smash",
      value: {
        actionType: { tag: "Attack" },
        requirements: requirements({ blunt: 1 }),
        rounds: [{ effects: [{ tag: "Attack", value: 1 }], interruptible: false }],
      },
    },
    postureAction("test_stand", "test_standing"),
    postureAction("test_duel", "test_dueling"),
    {
      name: "test_rearm",
      value: {
        actionType: { tag: "Rearm" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Rearm" }], interruptible: false }],
      },
    },
    {
      name: "test_equip",
      value: {
        actionType: { tag: "Equip" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Equip" }], interruptible: false }],
      },
    },
    {
      name: "test_unequip",
      value: {
        actionType: { tag: "Equip" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Unequip" }], interruptible: false }],
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
        actionNames: [
          "test_take",
          "test_slash",
          "test_stand",
          "test_duel",
          "test_equip",
          "test_unequip",
        ],
      }),
    },
  ],
  armaments: [
    {
      name: "test_sword",
      value: statBlock({ bladed: 1, hand: -1 }),
    },
    {
      name: "test_club",
      value: statBlock({ blunt: 1, hand: -1, actionNames: ["test_smash"] }),
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
    appliesStatBlock: {},
    baselineName: "test_human",
    stanceName: "test_standing",
    location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
  }),
  instantiateEntityBlobs: [
    blob({
      item: { tag: "Armament", value: "test_sword" },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
    blob({
      item: { tag: "Armament", value: "test_club" },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
    blob({
      item: { tag: "Armor", value: "test_jerkin" },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
    blob({
      item: { tag: "Relic", value: "test_charm" },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
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
    postureAction("test_stand", "test_standing"),
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
        actionNames: ["test_move", "test_stand"],
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
    appliesStatBlock: {},
    baselineName: "test_mouse",
    stanceName: "test_standing",
    location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
  }),
  instantiateEntityBlobs: [
    blob({
      enemyController: {},
      appliesStatBlock: {},
      baselineName: "test_giant",
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
      allegiance: { allegianceEntityId: { tag: "Literal", value: 200n } },
    }),
    blob({
      path: {
        destinationEntityId: { tag: "Literal", value: 1000n },
        destinationKind: { tag: "Interior" },
      },
      offeredActionNames: ["test_move"],
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
  ],
});

/**
 * A connections world: two tiny maps joined both-ways (near's Ending to
 * far's Entrance). The player spawns through real map generation in "near"
 * (no authored location, so activation generates it), walks to the anchor
 * room, and demand does the rest: far map generated, path materialized,
 * return path on arrival, cleanup timer once abandoned.
 */
export const connectionsPack = (): AssetPack => ({
  ...emptyPack(),
  actions: [
    {
      name: "test_move",
      value: {
        actionType: { tag: "Move" },
        requirements: requirements({ gait: 1 }),
        rounds: [{ effects: [{ tag: "Move" }], interruptible: false }],
      },
    },
  ],
  baselines: [
    {
      name: "test_walker",
      value: statBlock({ mhp: 5, gait: 2, actionNames: ["test_move"] }),
    },
  ],
  locationMapThemes: [
    {
      name: "test_link_theme",
      value: {
        decorationsSelector: { selections: [] },
        minDecorationCount: 0,
        maxDecorationCount: 0,
        pathsSelector: {
          selections: [
            {
              weight: 1,
              pair: {
                forward: blob({ offeredActionNames: ["test_move"] }),
                backward: blob({ offeredActionNames: ["test_move"] }),
              },
            },
          ],
        },
        roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        checkpointsSelector: { selections: [] },
        containersSelector: { selections: [] },
        minContainerCount: 0,
        maxContainerCount: 0,
        blockersSelector: { selections: [] },
        pathVariationNames: [],
        pathVariationCountWeights: new Uint8Array(),
      },
    },
  ],
  locationMaps: [
    {
      name: "test_near",
      value: {
        themeName: "test_link_theme",
        layout: { tag: "Path" },
        zoneKind: { tag: "Private" },
        rngSeed: 0n,
        mainRoomCount: 2,
        extraRoomCount: 0,
        loopCount: 0,
        encounterNamesSampler: [],
        minEncounterCount: 0,
        maxEncounterCount: 0,
        minHiddenRoomCount: 0,
        maxHiddenRoomCount: 0,
        questSpawns: [],
        questRoomClaims: [],
        roomLocation: undefined,
      },
    },
    {
      name: "test_far",
      value: {
        themeName: "test_link_theme",
        layout: { tag: "Path" },
        zoneKind: { tag: "Private" },
        rngSeed: 0n,
        mainRoomCount: 1,
        extraRoomCount: 0,
        loopCount: 0,
        encounterNamesSampler: [],
        minEncounterCount: 0,
        maxEncounterCount: 0,
        minHiddenRoomCount: 0,
        maxHiddenRoomCount: 0,
        questSpawns: [],
        questRoomClaims: [],
        roomLocation: undefined,
      },
    },
  ],
  connections: [
    {
      exitLocationMapName: "test_near",
      destinationLocationMapName: "test_far",
      exitAnchor: { tag: "Ending" },
      destinationAnchor: { tag: "Entrance" },
      bothWays: true,
      pathPair: undefined,
    },
  ],
  newPlayerBlob: blob({
    appliesStatBlock: {},
    baselineName: "test_walker",
    allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
  }),
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
        containersSelector: { selections: [] },
        minContainerCount: 0,
        maxContainerCount: 0,
        blockersSelector: { selections: [] },
        pathVariationNames: [],
        pathVariationCountWeights: new Uint8Array(),
      },
    },
  ],
  locationMaps: [
    {
      name: "test_haven",
      value: {
        themeName: "test_haven_theme",
        layout: { tag: "Path" },
        zoneKind: { tag: "Private" },
        rngSeed: 0n,
        mainRoomCount: 1,
        extraRoomCount: 0,
        loopCount: 0,
        encounterNamesSampler: [],
        minEncounterCount: 0,
        maxEncounterCount: 0,
        minHiddenRoomCount: 0,
        maxHiddenRoomCount: 0,
        questSpawns: [],
        questRoomClaims: [],
        roomLocation: undefined,
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
    appliesStatBlock: {},
    baselineName: "test_hero",
    location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
  }),
  instantiateEntityBlobs: [
    blob({
      checkpointObject: {},
      checkpointBinding: { locationMapName: "test_haven", checkpointIndex: 0 },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
    blob({
      path: {
        destinationEntityId: { tag: "Literal", value: 1000n },
        destinationKind: { tag: "Interior" },
      },
      offeredActionNames: ["test_move"],
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
    blob({
      enemyController: {},
      appliesStatBlock: {},
      baselineName: "test_brute",
      location: {
        locationEntityId: { tag: "Literal", value: 1000n },
        kind: { tag: "Interior" },
      },
      allegiance: { allegianceEntityId: { tag: "Literal", value: 200n } },
    }),
    blob({
      enemyController: {},
      appliesStatBlock: {},
      baselineName: "test_vermin",
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
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
      }),
    },
  ],
  newPlayerBlob: blob({
    appliesStatBlock: {},
    baselineName: "test_human",
    stanceName: "test_standing",
    location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
  }),
  instantiateEntityBlobs: [
    blob({
      item: { tag: "Armament", value: "test_brave_sword" },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
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
  // A zero-stat trait + a marker feature: an entity carrying only this is
  // routed through the stat pipeline (it resolves appearance) but sums to
  // zero mhp/mep, so it must end up with NO HP component — never attackable.
  appearanceFeatures: [
    {
      name: "test_inert_mark",
      value: {
        text: "inert",
        appearanceFeatureType: { tag: "Noun" },
        priority: 5000,
        exclusionGroup: undefined,
      },
    },
  ],
  // A trait with a real mhp: an entity carrying it WOULD get HP — unless it
  // lacks the applies_stat_block opt-in, which is exactly what the test checks.
  traits: [
    {
      name: "test_inert",
      value: statBlock({ mhp: 5 }),
    },
  ],
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
    location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    actionNames: ["test_attack"],
    allegiance: { allegianceEntityId: { tag: "Literal", value: 100n } },
  }),
  instantiateEntityBlobs: [
    blob({
      enemyController: {},
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
      hp: {
        hp: enemyHp,
        mhp: enemyHp,
        defense: 0,
        accumulatedDamage: 0,
        accumulatedHealing: 0,
      },
      allegiance: { allegianceEntityId: { tag: "Literal", value: 200n } },
    }),
    // A trait that WOULD grant HP, but NO applies_stat_block opt-in: the
    // stat pipeline must skip it, so it stays HP-less and un-attackable. Its
    // marker feature is authored directly (not via the gated pipeline) so the
    // test can still find it.
    blob({
      traitNames: ["test_inert"],
      appearanceFeatureNames: ["test_inert_mark"],
      location: {
        locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
        kind: { tag: "Interior" },
      },
    }),
  ],
});

/**
 * A quest world: one 3-bit cookie quest (+1 mhp per bit), an eater with
 * take + eat, and three cookie items in the shared room — TWO carrying the
 * SAME index (duplicates are expected under the spawn-window model; supply
 * is limited by BITS) and one fresh second index.
 */
export const questPack = (): AssetPack => ({
  ...emptyPack(),
  quests: [
    {
      name: "test_red_cookies",
      value: { perBitStatBlock: statBlock({ mhp: 1 }), bitCount: 3 },
    },
  ],
  appearanceFeatures: [
    {
      name: "test_jar",
      value: {
        text: "jar",
        appearanceFeatureType: { tag: "Noun" },
        priority: 5000,
        exclusionGroup: undefined,
      },
    },
    {
      name: "test_shards",
      value: {
        text: "ceramic shards",
        appearanceFeatureType: { tag: "Noun" },
        priority: 4000,
        exclusionGroup: undefined,
      },
    },
  ],
  actions: [
    {
      name: "test_take",
      value: {
        actionType: { tag: "Inventory" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Take" }], interruptible: false }],
      },
    },
    {
      name: "test_eat",
      value: {
        actionType: { tag: "Eat" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Eat" }], interruptible: false }],
      },
    },
    {
      name: "test_smash",
      value: {
        actionType: { tag: "Attack" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Attack", value: 1 }], interruptible: false }],
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
        actionNames: ["test_take", "test_eat", "test_smash"],
      }),
    },
  ],
  namedInstantiateEntityBlobs: [
    {
      name: "test_cookie_jar",
      value: blob({
        appearanceFeatureNames: ["test_jar"],
        remainsAppearanceFeatureNames: ["test_shards"],
        hp: {
          hp: 1,
          mhp: 1,
          defense: 0,
          accumulatedDamage: 0,
          accumulatedHealing: 0,
        },
        location: {
          locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
          kind: { tag: "Interior" },
        },
      }),
    },
  ],
  newPlayerBlob: blob({
    appliesStatBlock: {},
    baselineName: "test_human",
    location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
  }),
  instantiateEntityBlobs: [
    blob({
      item: {
        tag: "QuestItem",
        value: { questName: "test_red_cookies", index: 0 },
      },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
    blob({
      item: {
        tag: "QuestItem",
        value: { questName: "test_red_cookies", index: 0 },
      },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
    blob({
      item: {
        tag: "QuestItem",
        value: { questName: "test_red_cookies", index: 1 },
      },
      location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
    }),
    // The payoff cookie hides INSIDE the jar: smashing it spills this out.
    blob({
      item: {
        tag: "QuestItem",
        value: { questName: "test_red_cookies", index: 2 },
      },
      location: {
        locationEntityId: { tag: "Named", value: "test_cookie_jar" },
        kind: { tag: "Interior" },
      },
    }),
  ],
});

/**
 * An interactions world: two containers in the shared room, each OFFERING
 * its gentle verb — a chest that opens (contents revealed, takeable in
 * place, intact) and a sack that dumps (contents spill to the floor,
 * container unharmed). The player knows only take: open and dump come
 * from the containers themselves. A cookie hides in each.
 */
export const interactionsPack = (): AssetPack => ({
  ...emptyPack(),
  quests: [
    {
      name: "test_hidden_cookies",
      value: { perBitStatBlock: statBlock({ mhp: 1 }), bitCount: 2 },
    },
  ],
  actions: [
    {
      name: "test_take",
      value: {
        actionType: { tag: "Inventory" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Take" }], interruptible: false }],
      },
    },
    {
      name: "test_open",
      value: {
        actionType: { tag: "Interact" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Open" }], interruptible: false }],
      },
    },
    {
      name: "test_dump",
      value: {
        actionType: { tag: "Interact" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Dump" }], interruptible: false }],
      },
    },
    // Offered by the chest but beyond any looter: the actor-requirements
    // gate refuses it at queue time (size 5 against a size-0 body).
    {
      name: "test_heave",
      value: {
        actionType: { tag: "Interact" },
        requirements: requirements({ size: 5 }),
        rounds: [{ effects: [{ tag: "Open" }], interruptible: false }],
      },
    },
  ],
  // The looter KNOWS no item verbs: take derives from the registry.
  takeActionName: "test_take",
  baselines: [
    {
      name: "test_looter",
      value: statBlock({ mhp: 5, hand: 2 }),
    },
  ],
  namedInstantiateEntityBlobs: [
    {
      name: "test_chest",
      value: blob({
        offeredActionNames: ["test_open", "test_heave"],
        hp: {
          hp: 2,
          mhp: 2,
          defense: 0,
          accumulatedDamage: 0,
          accumulatedHealing: 0,
        },
        location: {
          locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
          kind: { tag: "Interior" },
        },
      }),
    },
    {
      name: "test_sack",
      value: blob({
        offeredActionNames: ["test_dump"],
        hp: {
          hp: 2,
          mhp: 2,
          defense: 0,
          accumulatedDamage: 0,
          accumulatedHealing: 0,
        },
        location: {
          locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
          kind: { tag: "Interior" },
        },
      }),
    },
  ],
  newPlayerBlob: blob({
    appliesStatBlock: {},
    baselineName: "test_looter",
    location: {
      locationEntityId: { tag: "Literal", value: SHARED_LOCATION_ID },
      kind: { tag: "Interior" },
    },
  }),
  instantiateEntityBlobs: [
    blob({
      item: {
        tag: "QuestItem",
        value: { questName: "test_hidden_cookies", index: 0 },
      },
      location: {
        locationEntityId: { tag: "Named", value: "test_chest" },
        kind: { tag: "Interior" },
      },
    }),
    blob({
      item: {
        tag: "QuestItem",
        value: { questName: "test_hidden_cookies", index: 1 },
      },
      location: {
        locationEntityId: { tag: "Named", value: "test_sack" },
        kind: { tag: "Interior" },
      },
    }),
  ],
});

/**
 * A generated world with quest windows: one map whose generation must
 * place a breakable container, and whose quest application must inject
 * the declared cookie indexes into it — no cookie is authored at push
 * time. Deterministic: seed 0, container count locked to 1, eligible
 * draw locked to 1 (guaranteed [0, 1] + one of [2, 3, 4]).
 */
export const spawnPack = (): AssetPack => ({
  ...emptyPack(),
  quests: [
    {
      name: "test_spawn_cookies",
      value: { perBitStatBlock: statBlock({ mhp: 1 }), bitCount: 5 },
    },
  ],
  appearanceFeatures: [
    {
      name: "test_jar",
      value: {
        text: "jar",
        appearanceFeatureType: { tag: "Noun" },
        priority: 5000,
        exclusionGroup: undefined,
      },
    },
    {
      name: "test_shards",
      value: {
        text: "ceramic shards",
        appearanceFeatureType: { tag: "Noun" },
        priority: 4000,
        exclusionGroup: undefined,
      },
    },
    {
      name: "test_cookie",
      value: {
        text: "cookie",
        appearanceFeatureType: { tag: "Noun" },
        priority: 5000,
        exclusionGroup: undefined,
      },
    },
  ],
  locationMapThemes: [
    {
      name: "test_spawn_theme",
      value: {
        decorationsSelector: { selections: [] },
        minDecorationCount: 0,
        maxDecorationCount: 0,
        pathsSelector: {
          selections: [
            { weight: 1, pair: { forward: blob({}), backward: blob({}) } },
          ],
        },
        roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        checkpointsSelector: { selections: [] },
        containersSelector: {
          selections: [
            {
              weight: 1,
              blob: blob({
                appearanceFeatureNames: ["test_jar"],
                remainsAppearanceFeatureNames: ["test_shards"],
                hp: {
                  hp: 1,
                  mhp: 1,
                  defense: 0,
                  accumulatedDamage: 0,
                  accumulatedHealing: 0,
                },
              }),
            },
          ],
        },
        minContainerCount: 1,
        maxContainerCount: 1,
        blockersSelector: { selections: [] },
        pathVariationNames: [],
        pathVariationCountWeights: new Uint8Array(),
      },
    },
  ],
  locationMaps: [
    {
      name: "test_spawn_map",
      value: {
        themeName: "test_spawn_theme",
        layout: { tag: "Path" },
        zoneKind: { tag: "Private" },
        rngSeed: 0n,
        mainRoomCount: 3,
        extraRoomCount: 2,
        loopCount: 0,
        encounterNamesSampler: [],
        minEncounterCount: 0,
        maxEncounterCount: 0,
        minHiddenRoomCount: 0,
        maxHiddenRoomCount: 0,
        questSpawns: [
          {
            questName: "test_spawn_cookies",
            itemBlob: blob({ appearanceFeatureNames: ["test_cookie"] }),
            guaranteedIndexes: [0, 1],
            eligibleIndexes: [2, 3, 4],
            minEligibleCount: 1,
            maxEligibleCount: 2,
          },
        ],
        questRoomClaims: [],
        roomLocation: undefined,
      },
    },
  ],
  newPlayerBlob: blob({}),
});

/**
 * A boss-claim world: a three-room chain whose map gives its Ending room
 * to a 1-bit conquest quest — the warden encounter spawns there, the link
 * row records the claim, and a themed checkpoint object lands in the
 * middle room (the boss approached from a save point). Felling the
 * warden drops one conquest quest item per player present. No wandering
 * encounters and no item spawns: the only inhabitants are the claim's.
 */
export const bossPack = (): AssetPack => ({
  ...emptyPack(),
  quests: [
    {
      name: "test_conquest",
      value: { perBitStatBlock: statBlock({ mhp: 2 }), bitCount: 1 },
    },
  ],
  actions: [
    {
      name: "test_move",
      value: {
        actionType: { tag: "Move" },
        requirements: requirements({ gait: 1 }),
        rounds: [{ effects: [{ tag: "Move" }], interruptible: false }],
      },
    },
    {
      name: "test_strike",
      value: {
        actionType: { tag: "Attack" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Attack", value: 5 }], interruptible: false }],
      },
    },
    {
      name: "test_take",
      value: {
        actionType: { tag: "Inventory" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Take" }], interruptible: false }],
      },
    },
    {
      name: "test_eat",
      value: {
        actionType: { tag: "Eat" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Eat" }], interruptible: false }],
      },
    },
  ],
  // The item verbs derive from the registry — the challenger knows only
  // how to walk and fight.
  takeActionName: "test_take",
  eatActionName: "test_eat",
  baselines: [
    {
      name: "test_challenger",
      value: statBlock({
        mhp: 10,
        gait: 2,
        attack: 0,
        actionNames: ["test_move", "test_strike"],
      }),
    },
    {
      name: "test_warden_base",
      value: statBlock({ mhp: 10 }),
    },
  ],
  encounterBlobs: [
    { name: "test_warden_categoric", value: blob({ appliesStatBlock: {} }) },
    {
      name: "test_warden",
      value: blob({
        baselineName: "test_warden_base",
        enemyController: {},
      }),
    },
  ],
  encounters: [
    {
      name: "test_warden_lair",
      value: {
        categoricBlobName: "test_warden_categoric",
        blobNames: ["test_warden"],
      },
    },
  ],
  locationMapThemes: [
    {
      name: "test_boss_theme",
      value: {
        decorationsSelector: { selections: [] },
        minDecorationCount: 0,
        maxDecorationCount: 0,
        pathsSelector: {
          selections: [
            {
              weight: 1,
              pair: {
                forward: blob({ offeredActionNames: ["test_move"] }),
                backward: blob({ offeredActionNames: ["test_move"] }),
              },
            },
          ],
        },
        roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        checkpointsSelector: {
          selections: [{ weight: 1, blob: blob({ checkpointObject: {} }) }],
        },
        containersSelector: { selections: [] },
        minContainerCount: 0,
        maxContainerCount: 0,
        blockersSelector: { selections: [] },
        pathVariationNames: [],
        pathVariationCountWeights: new Uint8Array(),
      },
    },
  ],
  locationMaps: [
    {
      name: "test_boss_map",
      value: {
        themeName: "test_boss_theme",
        layout: { tag: "Path" },
        zoneKind: { tag: "Private" },
        rngSeed: 0n,
        mainRoomCount: 3,
        extraRoomCount: 0,
        loopCount: 0,
        encounterNamesSampler: [],
        minEncounterCount: 0,
        maxEncounterCount: 0,
        minHiddenRoomCount: 0,
        maxHiddenRoomCount: 0,
        questSpawns: [],
        questRoomClaims: [
          {
            questName: "test_conquest",
            role: { tag: "Boss" },
            encounterName: "test_warden_lair",
            spawnCheckpointBefore: true,
            defeatDrop: {
              questName: "test_conquest",
              index: 0,
              itemBlob: blob({}),
            },
          },
        ],
        roomLocation: undefined,
      },
    },
  ],
  newPlayerBlob: blob({ appliesStatBlock: {}, baselineName: "test_challenger" }),
});

/**
 * A two-room arena for the turn guard: the player wakes in the entrance,
 * one lurker waits in the far room (encounter count locked to 1, and the
 * encounter layer never uses the entrance). zoneKind decides the pacing
 * under test: Private is turn-guarded, Common is realtime.
 */
export const arenaPack = (zoneKind: "Private" | "Common"): AssetPack => ({
  ...emptyPack(),
  actions: [
    {
      name: "test_move",
      value: {
        actionType: { tag: "Move" },
        requirements: requirements({ gait: 1 }),
        rounds: [{ effects: [{ tag: "Move" }], interruptible: false }],
      },
    },
    {
      name: "test_strike",
      value: {
        actionType: { tag: "Attack" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Attack", value: 2 }], interruptible: false }],
      },
    },
  ],
  baselines: [
    {
      name: "test_hero",
      value: statBlock({
        mhp: 20,
        gait: 2,
        attack: 1,
        actionNames: ["test_move", "test_strike"],
      }),
    },
    {
      name: "test_lurker_base",
      value: statBlock({ mhp: 10, attack: 1, actionNames: ["test_strike"] }),
    },
  ],
  encounterBlobs: [
    { name: "test_lurker_categoric", value: blob({ appliesStatBlock: {} }) },
    {
      name: "test_lurker",
      value: blob({
        baselineName: "test_lurker_base",
        enemyController: {},
      }),
    },
  ],
  encounters: [
    {
      name: "test_ambush",
      value: {
        categoricBlobName: "test_lurker_categoric",
        blobNames: ["test_lurker"],
      },
    },
  ],
  locationMapThemes: [
    {
      name: "test_arena_theme",
      value: {
        decorationsSelector: { selections: [] },
        minDecorationCount: 0,
        maxDecorationCount: 0,
        pathsSelector: {
          selections: [
            {
              weight: 1,
              pair: {
                forward: blob({ offeredActionNames: ["test_move"] }),
                backward: blob({ offeredActionNames: ["test_move"] }),
              },
            },
          ],
        },
        roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        checkpointsSelector: { selections: [] },
        containersSelector: { selections: [] },
        minContainerCount: 0,
        maxContainerCount: 0,
        blockersSelector: { selections: [] },
        pathVariationNames: [],
        pathVariationCountWeights: new Uint8Array(),
      },
    },
  ],
  locationMaps: [
    {
      name: "test_arena",
      value: {
        themeName: "test_arena_theme",
        layout: { tag: "Path" },
        zoneKind: { tag: zoneKind },
        rngSeed: 0n,
        mainRoomCount: 2,
        extraRoomCount: 0,
        loopCount: 0,
        encounterNamesSampler: [{ weight: 1, name: "test_ambush" }],
        minEncounterCount: 1,
        maxEncounterCount: 1,
        minHiddenRoomCount: 0,
        maxHiddenRoomCount: 0,
        questSpawns: [],
        questRoomClaims: [],
        roomLocation: undefined,
      },
    },
  ],
  newPlayerBlob: blob({ appliesStatBlock: {}, baselineName: "test_hero" }),
});

/**
 * A guarded three-room chain for hidden paths and backward-loop guards.
 * hiddenRoomCount side rooms hide behind a breakable boulder in their
 * attachment room (count locked exact); loopCount adds the guarded
 * backward path pair (rooms 0<->2 for a 3-room chain) with its boulder
 * in the FAR room. Boulders die to one smash and leave rubble.
 */
export const guardedMapPack = ({
  hiddenRoomCount,
  loopCount,
}: {
  hiddenRoomCount: number;
  loopCount: number;
}): AssetPack => ({
  ...emptyPack(),
  appearanceFeatures: [
    {
      name: "test_boulder",
      value: {
        text: "boulder",
        appearanceFeatureType: { tag: "Noun" },
        priority: 5000,
        exclusionGroup: undefined,
      },
    },
    {
      name: "test_rubble",
      value: {
        text: "rubble",
        appearanceFeatureType: { tag: "Noun" },
        priority: 4000,
        exclusionGroup: undefined,
      },
    },
  ],
  actions: [
    {
      name: "test_move",
      value: {
        actionType: { tag: "Move" },
        requirements: requirements({ gait: 1 }),
        rounds: [{ effects: [{ tag: "Move" }], interruptible: false }],
      },
    },
    {
      name: "test_smash",
      value: {
        actionType: { tag: "Attack" },
        requirements: NO_REQUIREMENTS,
        rounds: [{ effects: [{ tag: "Attack", value: 2 }], interruptible: false }],
      },
    },
  ],
  baselines: [
    {
      name: "test_scout",
      value: statBlock({
        mhp: 10,
        gait: 2,
        attack: 1,
        actionNames: ["test_move", "test_smash"],
      }),
    },
  ],
  locationMapThemes: [
    {
      name: "test_guard_theme",
      value: {
        decorationsSelector: { selections: [] },
        minDecorationCount: 0,
        maxDecorationCount: 0,
        pathsSelector: {
          selections: [
            {
              weight: 1,
              pair: {
                forward: blob({ offeredActionNames: ["test_move"] }),
                backward: blob({ offeredActionNames: ["test_move"] }),
              },
            },
          ],
        },
        roomsSelector: { selections: [{ weight: 1, blob: blob({}) }] },
        checkpointsSelector: { selections: [] },
        containersSelector: { selections: [] },
        minContainerCount: 0,
        maxContainerCount: 0,
        blockersSelector: {
          selections: [
            {
              weight: 1,
              blob: blob({
                appearanceFeatureNames: ["test_boulder"],
                remainsAppearanceFeatureNames: ["test_rubble"],
                hp: {
                  hp: 1,
                  mhp: 1,
                  defense: 0,
                  accumulatedDamage: 0,
                  accumulatedHealing: 0,
                },
              }),
            },
          ],
        },
        pathVariationNames: [],
        pathVariationCountWeights: new Uint8Array(),
      },
    },
  ],
  locationMaps: [
    {
      name: "test_guarded",
      value: {
        themeName: "test_guard_theme",
        layout: { tag: "Path" },
        zoneKind: { tag: "Private" },
        rngSeed: 0n,
        mainRoomCount: 3,
        extraRoomCount: hiddenRoomCount,
        loopCount,
        encounterNamesSampler: [],
        minEncounterCount: 0,
        maxEncounterCount: 0,
        minHiddenRoomCount: hiddenRoomCount,
        maxHiddenRoomCount: hiddenRoomCount,
        questSpawns: [],
        questRoomClaims: [],
        roomLocation: undefined,
      },
    },
  ],
  newPlayerBlob: blob({ appliesStatBlock: {}, baselineName: "test_scout" }),
});
