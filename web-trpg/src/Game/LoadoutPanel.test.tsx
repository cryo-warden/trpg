import { test, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import {
  armamentIdOf,
  armorIdOf,
  mockTable,
  relicIdOf,
  stanceIdOf,
} from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { LoadoutPanel } from "./LoadoutPanel";

// The player (entity 1) carries a sword item (entity 5), a jerkin (6), and
// a charm (7): carrying IS location.
const tables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  location_components: mockTable([
    { entityId: 5n, locationEntityId: 1n },
    { entityId: 6n, locationEntityId: 1n },
    { entityId: 7n, locationEntityId: 1n },
  ]),
  item_components: mockTable([
    { entityId: 5n, itemRef: { tag: "Armament", value: armamentIdOf("sword") } },
    { entityId: 6n, itemRef: { tag: "Armor", value: armorIdOf("leather_jerkin") } },
    { entityId: 7n, itemRef: { tag: "Relic", value: relicIdOf("ember_charm") } },
  ]),
  armor_components: mockTable([]),
  relics_components: mockTable([]),
  stance_loadouts_components: mockTable([]),
  active_stance_components: mockTable([]),
});

test("LoadoutPanel lists owned gear by kind with resolved names", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<LoadoutPanel />, { wrapper });

  expect(container.querySelector(".armor")?.textContent).toContain(
    "leather_jerkin",
  );
  expect(container.querySelector(".relics")?.textContent).toContain(
    "ember_charm",
  );
  expect(container.querySelector(".stanceArmaments")?.textContent).toContain(
    "sword",
  );
});

test("clicking an armament under a stance assigns it", () => {
  const assignStanceArmaments = mock(() => {});
  const wrapper = gameWrapper(tables(), {
    identity: {} as Identity,
    reducers: { assignStanceArmaments },
  });
  const { container } = render(<LoadoutPanel />, { wrapper });

  const dueling = [
    ...container.querySelectorAll(".stanceArmaments h4"),
  ].find((heading) => heading.textContent === "dueling")!;
  // The armament buttons for a stance directly follow its heading.
  const swordButton = dueling.nextElementSibling!;
  expect(swordButton.textContent).toBe("sword");
  fireEvent.click(swordButton);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    armamentIds: [armamentIdOf("sword")],
  });
});

test("toggling a relic on proposes the extended relic set", () => {
  const setRelics = mock(() => {});
  const wrapper = gameWrapper(tables(), {
    identity: {} as Identity,
    reducers: { setRelics },
  });
  const { container } = render(<LoadoutPanel />, { wrapper });

  const charm = [...container.querySelectorAll(".relics button")].find(
    (button) => button.textContent === "ember_charm",
  )!;
  fireEvent.click(charm);
  expect(setRelics).toHaveBeenCalledWith({
    relicIds: [relicIdOf("ember_charm")],
  });
});
