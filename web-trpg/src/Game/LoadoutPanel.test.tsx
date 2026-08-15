import { test, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import {
  actionIdOf,
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
  expect(container.querySelector("section.totals")?.textContent).toContain(
    "+1 defense",
  );
  expect(container.querySelector("section.totals")?.textContent).toContain(
    "+1 bladed",
  );
  // The default slot lists the sword as held.
  const defaults = container.querySelector(".defaultArmaments");
  expect(defaults?.textContent).toContain("sword");
  expect(defaults?.querySelectorAll("button.active").length).toBe(1);
});

test("an armament button CONFIGURES the default set: toggled on when off, off when on", () => {
  // Menus configure core state immediately — the toggle proposes the new
  // default set; whether any in-fiction action queues is the server's
  // business, invisible here.
  const setDefaultArmaments = mock(() => {});
  const withTotals = {
    ...tables(),
    total_stat_block_components: mockTable([
      { entityId: 1n, statBlock: { hand: 2 } },
    ]),
  };
  const off = render(<LoadoutPanel />, {
    wrapper: gameWrapper(withTotals, {
      identity: {} as Identity,
      reducers: { setDefaultArmaments },
    }),
  });
  const swordOff = [
    ...off.container.querySelectorAll(".defaultArmaments button"),
  ].find((button) => button.textContent!.startsWith("sword"))!;
  expect(swordOff.hasAttribute("disabled")).toBe(false);
  fireEvent.click(swordOff);
  expect(setDefaultArmaments).toHaveBeenCalledWith({
    armamentIds: [armamentIdOf("sword")],
  });

  const setOn = mock(() => {});
  const assigned = {
    ...withTotals,
    default_armaments_components: mockTable([
      { entityId: 1n, armamentIds: [armamentIdOf("sword")] },
    ]),
  };
  const on = render(<LoadoutPanel />, {
    wrapper: gameWrapper(assigned, {
      identity: {} as Identity,
      reducers: { setDefaultArmaments: setOn },
    }),
  });
  const swordOn = [
    ...on.container.querySelectorAll(".defaultArmaments button"),
  ].find((button) => button.textContent!.startsWith("sword"))!;
  expect(swordOn.className).toContain("active");
  fireEvent.click(swordOn);
  expect(setOn).toHaveBeenCalledWith({ armamentIds: [] });
});

test("an armament past the DEFAULT configuration's free hand renders visibly disabled", () => {
  // The basis is the DEFAULT configuration, not what's in hand: total
  // hand 0 with the sword's -1 folded in (equipment holds it), defaults
  // empty → default configuration hand = 0 - (-1) + 0 = 1. The staff
  // (-2) would drive it negative: visibly disabled. The sword (-1)
  // stays available.
  const setDefaultArmaments = mock(() => {});
  const withStaff = {
    ...tables(),
    location_components: mockTable([
      { entityId: 5n, locationEntityId: 1n },
      { entityId: 9n, locationEntityId: 1n },
    ]),
    item_components: mockTable([
      { entityId: 5n, itemRef: { tag: "Armament", value: armamentIdOf("sword") } },
      { entityId: 9n, itemRef: { tag: "Armament", value: armamentIdOf("staff") } },
    ]),
    // Total reflects the sword IN HAND (hand 1 - 1 = 0 base... authored
    // here directly): total hand 0 with the sword's -1 folded in.
    total_stat_block_components: mockTable([
      { entityId: 1n, statBlock: { hand: 0 } },
    ]),
    equipment_components: mockTable([
      { entityId: 1n, armamentIds: [armamentIdOf("sword")] },
    ]),
  };
  const { container } = render(<LoadoutPanel />, {
    wrapper: gameWrapper(withStaff, {
      identity: {} as Identity,
      reducers: { setDefaultArmaments },
    }),
  });
  // Default configuration hand: 0 - (sword -1) + (defaults: none) = 1.
  const buttons = [...container.querySelectorAll(".defaultArmaments button")];
  const staff = buttons.find((b) => b.textContent!.startsWith("staff"))!;
  const sword = buttons.find((b) => b.textContent!.startsWith("sword"))!;
  expect(staff.hasAttribute("disabled")).toBe(true);
  expect(sword.hasAttribute("disabled")).toBe(false);
  // A disabled button proposes nothing.
  fireEvent.click(staff);
  expect(setDefaultArmaments).not.toHaveBeenCalled();
});

test("the equip menu lays the stance card's detailed stats out — deltaless", () => {
  const withTotals = {
    ...tables(),
    total_stat_block_components: mockTable([
      { entityId: 1n, statBlock: { attack: 1, hand: 2 } },
    ]),
  };
  const { container } = render(<LoadoutPanel />, {
    wrapper: gameWrapper(withTotals, { identity: {} as Identity }),
  });
  const groupsText = [...container.querySelectorAll(".statGroup")]
    .map((group) => group.textContent)
    .join(" ");
  // The categorized groups a stance card shows...
  expect(groupsText).toContain("Combat");
  expect(groupsText).toContain("Attack 1");
  expect(groupsText).toContain("Hand 2");
  // ...but NO deltas anywhere: this is the base stances compare to.
  expect(groupsText).not.toContain("(");
});

test("the DEFAULT action bar proposes set_default_actions from its pool", () => {
  const setDefaultActions = mock(() => {});
  const withPool = {
    ...tables(),
    total_stat_block_components: mockTable([
      {
        entityId: 1n,
        statBlock: { hand: 2, actionIds: [actionIdOf("take")] },
      },
    ]),
  };
  const { container } = render(<LoadoutPanel />, {
    wrapper: gameWrapper(withPool, {
      identity: {} as Identity,
      reducers: { setDefaultActions },
    }),
  });
  const takeButton = [
    ...container.querySelectorAll(".defaultActions button"),
  ].find((button) => button.textContent === "Take")!;
  fireEvent.click(takeButton);
  expect(setDefaultActions).toHaveBeenCalledWith({
    actionIds: [actionIdOf("take")],
  });
});

test("pool clicks STACK onto the default bar, never replace it", () => {
  // Regression: default_actions_components was never subscribed, so the
  // client list read empty and every click proposed a one-element
  // replacement.
  const setDefaultActions = mock(() => {});
  const withBar = {
    ...tables(),
    total_stat_block_components: mockTable([
      {
        entityId: 1n,
        statBlock: { hand: 2, actionIds: [actionIdOf("take"), actionIdOf("heal")] },
      },
    ]),
    default_actions_components: mockTable([
      { entityId: 1n, actionIds: [actionIdOf("take")] },
    ]),
  };
  const { container } = render(<LoadoutPanel />, {
    wrapper: gameWrapper(withBar, {
      identity: {} as Identity,
      reducers: { setDefaultActions },
    }),
  });
  const healButton = [
    ...container.querySelectorAll(".defaultActions button"),
  ].find((button) => button.textContent === "Heal")!;
  fireEvent.click(healButton);
  expect(setDefaultActions).toHaveBeenCalledWith({
    actionIds: [actionIdOf("take"), actionIdOf("heal")],
  });
});

test("owned items render in stable ENTITY order regardless of row order", () => {
  // Regression: raw table iteration order fed both button order and the
  // counted first-instance rule, so a click could light a DIFFERENT
  // instance's button after an update reshuffled rows.
  const reversedRows = {
    ...tables(),
    location_components: mockTable([
      { entityId: 9n, locationEntityId: 1n },
      { entityId: 5n, locationEntityId: 1n },
    ]),
    item_components: mockTable([
      { entityId: 9n, itemRef: { tag: "Armament", value: armamentIdOf("staff") } },
      { entityId: 5n, itemRef: { tag: "Armament", value: armamentIdOf("sword") } },
    ]),
  };
  const { container } = render(<LoadoutPanel />, {
    wrapper: gameWrapper(reversedRows, { identity: {} as Identity }),
  });
  const labels = [
    ...container.querySelectorAll(".defaultArmaments button"),
  ].map((button) => button.textContent!.split(" ")[0]);
  expect(labels).toEqual(["sword", "staff"]);
});

test("a fifth relic renders visibly disabled at the four-cap", () => {
  const atCap = {
    ...tables(),
    relics_components: mockTable([
      {
        entityId: 1n,
        relicIds: [
          relicIdOf("frost_talisman"),
          relicIdOf("storm_bead"),
          relicIdOf("bone_idol"),
          relicIdOf("sun_medallion"),
        ],
      },
    ]),
  };
  const { container } = render(<LoadoutPanel />, {
    wrapper: gameWrapper(atCap, { identity: {} as Identity }),
  });
  const charm = [...container.querySelectorAll(".relics button")].find(
    (button) => button.textContent!.startsWith("ember_charm"),
  )!;
  expect(charm.hasAttribute("disabled")).toBe(true);
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
