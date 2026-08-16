import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { mapGenPack } from "./testAssets";

// Phase 5: exercise the real new_player + map-generation flow on a tiny
// test-specific map (fixed rng seed, minimal theme). A fresh client is placed
// into a freshly generated room/path graph.

let seeder: DbConnection;
let player: DbConnection;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  seeder = (await connect()).connection;
  seeder.subscriptionBuilder().subscribe(["SELECT * FROM actions"]);
  await claimAdmin(seeder);
  await seeder.reducers.pushAssets({ assetPack: mapGenPack() });
  await waitFor(() => seeder.db.actions.count() > 0);

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM player_controller_components",
      "SELECT * FROM location_components",
      "SELECT * FROM path_components",
      "SELECT * FROM allegiance_components",
      "SELECT * FROM named_entities",
      "SELECT * FROM appearance_features",
      "SELECT * FROM appearance_features_components",
      "SELECT * FROM enemy_controller_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM hp_share_components",
      "SELECT * FROM party_components",
    ]);
  await player.reducers.createAccount({ name: "explorer" });
}, 60000);

afterAll(() => {
  seeder?.disconnect();
  player?.disconnect();
});

test("new_player + map generation builds a room/path graph and places the player", async () => {
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  const entityId = [
    ...player.db.player_controller_components.iter(),
  ][0].entityId;

  // The generated map yields connecting paths, and the player is placed in it.
  await waitFor(() => player.db.path_components.count() > 0, 30000);
  await waitFor(
    () =>
      [...player.db.location_components.iter()].some(
        (row) => row.entityId === entityId,
      ),
    30000,
  );

  expect(player.db.path_components.count()).toBeGreaterThan(0);
}, 40000);

test("a new player is their own party leader (invariant repairs leader 0)", async () => {
  // Players are created with party_leader = 0; party_leader_sanitation_system
  // repoints any leader that isn't a live entity at the member itself. So a
  // lone player ends up leading their own party — every party lookup keys off
  // one entity id, no solo-vs-group branch.
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  const entityId = [
    ...player.db.player_controller_components.iter(),
  ][0].entityId;

  const ownLeader = () =>
    [...player.db.party_components.iter()].find(
      (row) => row.entityId === entityId,
    )?.partyLeader;
  await waitFor(() => ownLeader() === entityId, 30000);
  expect(ownLeader()).toBe(entityId);
});

test("generated paths receive a rolled variation feature", async () => {
  // The theme forces exactly one variation (test_winding) onto every
  // path, so every generated path must carry that feature index.
  await waitFor(() => player.db.appearance_features.count() > 0, 30000);
  const windingIndex = [...player.db.appearance_features.iter()].find(
    (row) => row.name === "test_winding",
  )?.index;
  expect(windingIndex).toBeDefined();

  await waitFor(() => player.db.path_components.count() > 0, 30000);
  const pathEntityIds = new Set(
    [...player.db.path_components.iter()].map((row) => row.entityId),
  );

  const pathCarriesWinding = () =>
    [...player.db.appearance_features_components.iter()].some(
      (row) =>
        pathEntityIds.has(row.entityId) &&
        [...row.appearanceFeatureIndexes].includes(windingIndex!),
    );
  await waitFor(pathCarriesWinding, 30000);
  expect(pathCarriesWinding()).toBe(true);
}, 40000);

test("generated path pairs are linked to share HP (for cave-ins)", async () => {
  // Both directions of a crossing are one physical thing: generation links
  // them with a MUTUAL HpShare, and each path is a real body with HP — so a
  // blow to one side collapses both.
  await waitFor(() => player.db.hp_share_components.count() > 0, 30000);

  const linkedPairWithHp = () => {
    const pathIds = new Set(
      [...player.db.path_components.iter()].map((r) => r.entityId),
    );
    const partnerOf = new Map(
      [...player.db.hp_share_components.iter()].map((r) => [
        r.entityId,
        r.partnerEntityId,
      ]),
    );
    const hasHp = new Set(
      [...player.db.hp_components.iter()].map((r) => r.entityId),
    );
    return [...partnerOf.entries()].find(
      ([id, partner]) =>
        pathIds.has(id) &&
        pathIds.has(partner) &&
        partnerOf.get(partner) === id &&
        hasHp.has(id) &&
        hasHp.has(partner),
    );
  };
  await waitFor(() => linkedPairWithHp() != null, 30000);
  expect(linkedPairWithHp()).toBeDefined();
});

test("a differentiable pack spawns with distinct variety traits", async () => {
  // The palette forces exactly one of three distinct variety traits onto each
  // of three co-spawned members, so the pack must end up carrying three
  // DISTINCT marks — proof the draw differentiates instead of cloning.
  await waitFor(() => player.db.appearance_features.count() > 0, 30000);
  const markIndexes = new Set(
    [...player.db.appearance_features.iter()]
      .filter((row) =>
        ["test_v1_mark", "test_v2_mark", "test_v3_mark"].includes(row.name),
      )
      .map((row) => row.index),
  );
  expect(markIndexes.size).toBe(3);

  await waitFor(
    () => player.db.enemy_controller_components.count() >= 3,
    30000,
  );
  const packIds = new Set(
    [...player.db.enemy_controller_components.iter()].map((r) => r.entityId),
  );

  const distinctMarksOnPack = () => {
    const seen = new Set<number>();
    for (const row of player.db.appearance_features_components.iter()) {
      if (!packIds.has(row.entityId)) continue;
      for (const index of row.appearanceFeatureIndexes) {
        if (markIndexes.has(index)) seen.add(index);
      }
    }
    return seen;
  };
  await waitFor(() => distinctMarksOnPack().size >= 3, 30000);
  expect(distinctMarksOnPack().size).toBe(3);
});

test("a differentiable item decoration gets a variety feature merged", async () => {
  // The decoration is UNFLAGGED (no stat block), so the trait's stats never
  // apply — but apply_variety must still merge its appearance feature straight
  // on. So every decoration carries its own mark plus one variety mark.
  await waitFor(() => player.db.appearance_features.count() > 0, 30000);
  const featureIndex = (name: string) =>
    [...player.db.appearance_features.iter()].find((r) => r.name === name)
      ?.index;
  const decoMark = featureIndex("test_deco_mark");
  const varietyMarks = new Set(
    ["test_v1_mark", "test_v2_mark", "test_v3_mark"].map(featureIndex),
  );
  expect(decoMark).toBeDefined();

  const decoHasVariety = () =>
    [...player.db.appearance_features_components.iter()].some((row) => {
      const indexes = [...row.appearanceFeatureIndexes];
      return (
        indexes.includes(decoMark!) && indexes.some((i) => varietyMarks.has(i))
      );
    });
  await waitFor(decoHasVariety, 30000);
  expect(decoHasVariety()).toBe(true);
});

test("the new player's allegiance resolved through the Named selector", async () => {
  const entityId = [
    ...player.db.player_controller_components.iter(),
  ][0].entityId;

  await waitFor(
    () =>
      [...player.db.allegiance_components.iter()].some(
        (row) => row.entityId === entityId,
      ),
    30000,
  );

  const allegianceEntityId = [...player.db.allegiance_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.allegianceEntityId;
  const registered = [...player.db.named_entities.iter()].find(
    (row) => row.name === "allegiance1",
  );
  expect(registered).toBeDefined();
  expect(allegianceEntityId).toBe(registered!.entityId);
}, 40000);
