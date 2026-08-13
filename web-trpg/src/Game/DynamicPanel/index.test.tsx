import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import {
  appearanceFeatureIndexOf,
  mockTable,
} from "../../testSupport/mockConnection";
import { gameWrapper } from "../../testSupport/gameWrapper";
import { DynamicPanel } from "./index";

const identity = {} as Identity;
const tables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  location_components: mockTable([
    { entityId: 1n, locationEntityId: 10n },
    { entityId: 2n, locationEntityId: 10n },
  ]),
  appearance_features_components: mockTable([
    { entityId: 1n, appearanceFeatureIndexes: [appearanceFeatureIndexOf("human")] },
    { entityId: 2n, appearanceFeatureIndexes: [appearanceFeatureIndexOf("path")] },
  ]),
  hp_components: mockTable([
    { entityId: 1n, hp: 5, mhp: 5, defense: 2 },
    { entityId: 2n, hp: 3, mhp: 3 },
  ]),
  ep_components: mockTable([
    { entityId: 1n, ep: 5, mep: 5 },
    { entityId: 2n, ep: 1, mep: 1 },
  ]),
  attack_components: mockTable([{ entityId: 1n, attack: 4 }]),
  allegiance_components: mockTable([]),
  path_components: mockTable([]),
});

test("DynamicPanel stances mode renders the stances menu", () => {
  const { container } = render(<DynamicPanel />, {
    wrapper: gameWrapper(tables(), { identity, mode: "stances" }),
  });
  expect(container.querySelector(".StancesMenu")).not.toBeNull();
});

test("DynamicPanel location mode lists co-located entities, excluding the player", () => {
  const { container } = render(<DynamicPanel />, {
    wrapper: gameWrapper(tables(), { identity, mode: "location" }),
  });
  expect(container.querySelectorAll(".EntityPanel").length).toBe(1);
  expect(container.textContent).toContain("path");
});
