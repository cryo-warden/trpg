import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { mockTable } from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { TargetPanel } from "./TargetPanel";

const identity = {} as Identity;
const tables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  location_components: mockTable([
    { entityId: 1n, locationEntityId: 10n },
    { entityId: 2n, locationEntityId: 10n },
  ]),
  appearance_features_components: mockTable([
    { entityId: 2n, appearanceFeatureIndexes: [0] },
  ]),
  hp_components: mockTable([{ entityId: 2n, hp: 3, mhp: 3 }]),
  ep_components: mockTable([{ entityId: 2n, ep: 1, mep: 1 }]),
  allegiance_components: mockTable([]),
  actions_components: mockTable([{ entityId: 1n, actionIds: [] }]),
  action_state_components: mockTable([]),
  queued_action_state_components: mockTable([]),
  action_hotkeys_components: mockTable([]),
  path_components: mockTable([]),
});

test("TargetPanel shows an empty panel when nothing is targeted", () => {
  const { container } = render(<TargetPanel />, {
    wrapper: gameWrapper(tables(), { identity, target: null }),
  });
  expect(container.querySelector(".Panel")).not.toBeNull();
  expect(container.querySelector(".EntityPanel")).toBeNull();
});

test("TargetPanel shows the targeted entity's detailed panel", () => {
  const { container } = render(<TargetPanel />, {
    wrapper: gameWrapper(tables(), { identity, target: 2n }),
  });
  expect(container.querySelector(".EntityPanel")).not.toBeNull();
  expect(container.textContent).toContain("human");
});

test("TargetPanel shows the self-selection panel when targeting the player", () => {
  const { getByText } = render(<TargetPanel />, {
    wrapper: gameWrapper(tables(), { identity, target: 1n }),
  });
  expect(getByText("Room")).not.toBeNull();
  expect(getByText("Stats")).not.toBeNull();
});
