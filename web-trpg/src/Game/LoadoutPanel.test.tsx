import { test, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import {
  armamentIdOf,
  armorIdOf,
  mockTable,
  relicIdOf,
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
  // Armaments moved to the stances menu; this menu is worn gear only.
  expect(container.querySelector(".stanceArmaments")).toBeNull();
});

test("of two identical armors, only the FIRST instance draws as worn", () => {
  // Regression: the armor highlight once compared asset ids alone, so
  // both jerkin ENTITIES lit up when one was worn. The counted-multiset
  // rule (stable entity order) decides for armor exactly like relics.
  const twoJerkins = {
    ...tables(),
    location_components: mockTable([
      { entityId: 6n, locationEntityId: 1n },
      { entityId: 8n, locationEntityId: 1n },
    ]),
    item_components: mockTable([
      { entityId: 6n, itemRef: { tag: "Armor", value: armorIdOf("leather_jerkin") } },
      { entityId: 8n, itemRef: { tag: "Armor", value: armorIdOf("leather_jerkin") } },
    ]),
    armor_components: mockTable([
      { entityId: 1n, armorId: armorIdOf("leather_jerkin") },
    ]),
  };
  const wrapper = gameWrapper(twoJerkins, { identity: {} as Identity });
  const { container } = render(<LoadoutPanel />, { wrapper });

  const activeArmorButtons = [
    ...container.querySelectorAll(".armor button.active"),
  ];
  expect(activeArmorButtons.length).toBe(1);
});

test("the menu shows totals, the equipped contribution, and the default armaments", () => {
  const equipped = {
    ...tables(),
    armor_components: mockTable([
      { entityId: 1n, armorId: armorIdOf("leather_jerkin") },
    ]),
    default_armaments_components: mockTable([
      { entityId: 1n, armamentIds: [armamentIdOf("sword")] },
    ]),
    total_stat_block_components: mockTable([]),
  };
  const wrapper = gameWrapper(equipped, { identity: {} as Identity });
  const { container } = render(<LoadoutPanel />, { wrapper });

  // The worn jerkin (+1 defense) and default sword (+1 bladed, -1 hand)
  // fold into one signed contribution line.
  expect(container.querySelector(".totals")?.textContent).toContain(
    "+1 defense",
  );
  expect(container.querySelector(".totals")?.textContent).toContain(
    "+1 bladed",
  );
  // The default slot lists the sword as held.
  const defaults = container.querySelector(".defaultArmaments");
  expect(defaults?.textContent).toContain("sword");
  expect(defaults?.querySelectorAll("button.active").length).toBe(1);
});

test("toggling a relic on proposes the extended relic set", () => {
  const setRelics = mock(() => {});
  const wrapper = gameWrapper(tables(), {
    identity: {} as Identity,
    reducers: { setRelics },
  });
  const { container } = render(<LoadoutPanel />, { wrapper });

  // Buttons carry the stat summary after the name now: match by prefix.
  const charm = [...container.querySelectorAll(".relics button")].find(
    (button) => button.textContent!.startsWith("ember_charm"),
  )!;
  fireEvent.click(charm);
  expect(setRelics).toHaveBeenCalledWith({
    relicIds: [relicIdOf("ember_charm")],
  });
});
