import { test, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import {
  actionIdOf,
  appearanceFeatureIndexOf,
  armamentIdOf,
  armorIdOf,
  mockTable,
  relicIdOf,
} from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { AppearanceFeatureName } from "./assets/appearance_features";
import { CustomizationPanel } from "./CustomizationPanel";

// The steady body plan: one armor slot, four relic slots, two hands — the
// capacities the base carries before any gear is worn.
const baseCapacities = { hand: 2, body: 1, relic: 4 };

// The per-group total rows the menu peels back to its steady base (the flat
// StatBlock is retired). Body-capacity always carries the body plan; a test adds
// stats/readiness only when it cares. Partial blocks are fine — the peel
// normalizes every field.
const groupTotals = ({
  stats = {},
  readiness = {},
  bodyCapacity = baseCapacities,
}: {
  stats?: Record<string, number>;
  readiness?: Record<string, number>;
  bodyCapacity?: Record<string, number>;
}) => ({
  stats_total_components: mockTable([{ entityId: 1n, stats }]),
  readiness_total_components: mockTable([{ entityId: 1n, readiness }]),
  body_capacity_total_components: mockTable([{ entityId: 1n, bodyCapacity }]),
});

// Item ENTITIES render their OWN appearance name (getName over their
// appearance features), never the gear asset's vocabulary name.
const appearanceRow = (entityId: bigint, names: AppearanceFeatureName[]) => ({
  entityId,
  appearanceFeatureIndexes: names.map(appearanceFeatureIndexOf),
});

// The player (entity 1) carries a sword item (entity 5), a jerkin (6), and
// a charm (7): carrying IS location. Each item names itself by its own
// appearance features.
const tables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  ...groupTotals({}),
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
  appearance_features_components: mockTable([
    appearanceRow(5n, ["sword"]),
    appearanceRow(6n, ["leather", "jerkin"]),
    appearanceRow(7n, ["ember", "charm"]),
  ]),
  armor_components: mockTable([]),
  relics_components: mockTable([]),
  stance_customizations_components: mockTable([]),
  active_stance_components: mockTable([]),
});

test("CustomizationPanel lists owned gear by kind with its ENTITY appearance name", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<CustomizationPanel />, { wrapper });

  // The item's own appearance name, never the internal underscored key.
  expect(container.querySelector(".armor")?.textContent).toContain(
    "leather jerkin",
  );
  expect(container.querySelector(".armor")?.textContent).not.toContain(
    "leather_jerkin",
  );
  expect(container.querySelector(".relics")?.textContent).toContain(
    "ember charm",
  );
  // Armaments moved to the stances menu; this menu is worn gear only.
  expect(container.querySelector(".stanceArmaments")).toBeNull();
});

test("of two identical armors, only the FIRST instance draws as worn", () => {
  // Regression: the armor highlight once compared asset ids alone, so
  // both jerkin ENTITIES lit up when one was worn. The worn armor is one
  // specific ENTITY, so exactly its button lights.
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
    appearance_features_components: mockTable([
      appearanceRow(6n, ["leather", "jerkin"]),
      appearanceRow(8n, ["leather", "jerkin"]),
    ]),
    armor_components: mockTable([{ entityId: 1n, armorEntityId: 6n }]),
  };
  const wrapper = gameWrapper(twoJerkins, { identity: {} as Identity });
  const { container } = render(<CustomizationPanel />, { wrapper });

  const activeArmorButtons = [
    ...container.querySelectorAll(".armor button.active"),
  ];
  expect(activeArmorButtons.length).toBe(1);
});

test("the menu shows totals, the equipped contribution, and the default armaments", () => {
  const equipped = {
    ...tables(),
    armor_components: mockTable([{ entityId: 1n, armorEntityId: 6n }]),
    default_armaments_components: mockTable([
      { entityId: 1n, armamentEntityIds: [5n] },
    ]),
  };
  const wrapper = gameWrapper(equipped, { identity: {} as Identity });
  const { container } = render(<CustomizationPanel />, { wrapper });

  // The worn jerkin (+1 defense) and default sword (+1 bladed, -1 hand)
  // fold into one signed contribution line — the applied configuration's
  // delta over the steady base.
  expect(container.querySelector("section.totals")?.textContent).toContain(
    "+1 defense",
  );
  expect(container.querySelector("section.totals")?.textContent).toContain(
    "+1 bladed",
  );
  // The default slot lists the sword as held, named by its appearance.
  const defaults = container.querySelector(".defaultArmaments");
  expect(defaults?.textContent).toContain("sword");
  expect(defaults?.querySelectorAll("button.active").length).toBe(1);
});

test("an armament button CONFIGURES the default set: toggled on when off, off when on", () => {
  // Menus configure core state immediately — the toggle proposes the new
  // default set of item ENTITIES; whether any in-fiction action queues is
  // the server's business, invisible here.
  const setDefaultArmaments = mock(() => {});
  const withTotals = {
    ...tables(),
    ...groupTotals({ bodyCapacity: { hand: 2 } }),
  };
  const off = render(<CustomizationPanel />, {
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
    armamentEntityIds: [5n],
  });

  const setOn = mock(() => {});
  const assigned = {
    ...withTotals,
    default_armaments_components: mockTable([
      { entityId: 1n, armamentEntityIds: [5n] },
    ]),
  };
  const on = render(<CustomizationPanel />, {
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
  expect(setOn).toHaveBeenCalledWith({ armamentEntityIds: [] });
});

test("an armament past the DEFAULT configuration's free hand renders visibly disabled", () => {
  // The basis is the DEFAULT configuration over the steady base: base hand 2,
  // no default armaments held → adding the two-handed staff (-2) is fine (0),
  // but wait — the sword is worn as armor? No: the sword is a one-hander in
  // the bags. With NO defaults held, both fit; so hold the sword as a default
  // (hand 2 - 1 = 1 free), and the staff (-2) would drive it negative:
  // visibly disabled. The sword itself stays available (toggle off).
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
    appearance_features_components: mockTable([
      appearanceRow(5n, ["sword"]),
      appearanceRow(9n, ["staff"]),
    ]),
    // Steady base hand 2 (no equipment/status/stance to peel).
    ...groupTotals({ bodyCapacity: { hand: 2 } }),
    // The sword is held in the default set, spending one grip.
    default_armaments_components: mockTable([
      { entityId: 1n, armamentEntityIds: [5n] },
    ]),
  };
  const { container } = render(<CustomizationPanel />, {
    wrapper: gameWrapper(withStaff, {
      identity: {} as Identity,
      reducers: { setDefaultArmaments },
    }),
  });
  const buttons = [...container.querySelectorAll(".defaultArmaments button")];
  const staff = buttons.find((b) => b.textContent!.startsWith("staff"))!;
  const sword = buttons.find((b) => b.textContent!.startsWith("sword"))!;
  // Free hand after the held sword is 1; the two-handed staff can't be added.
  expect(staff.hasAttribute("disabled")).toBe(true);
  // The held sword stays clickable (to toggle off).
  expect(sword.hasAttribute("disabled")).toBe(false);
  // A disabled button proposes nothing.
  fireEvent.click(staff);
  expect(setDefaultArmaments).not.toHaveBeenCalled();
});

test("the equip menu lays the stance card's detailed stats out — deltaless", () => {
  const withTotals = {
    ...tables(),
    ...groupTotals({ stats: { attack: 1 }, bodyCapacity: { hand: 2 } }),
  };
  const { container } = render(<CustomizationPanel />, {
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

test("the DEFAULT action bar proposes set_default_actions from its candidates", () => {
  const setDefaultActions = mock(() => {});
  // "Take" derives from readiness for any actor (it requires nothing), so the
  // base need only carry the body plan for the panel to render it.
  const withCandidates = {
    ...tables(),
    ...groupTotals({ bodyCapacity: { hand: 2 } }),
  };
  const { container } = render(<CustomizationPanel />, {
    wrapper: gameWrapper(withCandidates, {
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

test("a candidate click STACKS onto the default bar, never replaces it", () => {
  const setDefaultActions = mock(() => {});
  // Heal is a spell: it derives only when the readiness carries focus AND light,
  // so the base must supply both for the candidate to appear.
  const withBar = {
    ...tables(),
    ...groupTotals({
      bodyCapacity: { hand: 2 },
      readiness: { focus: 1, light: 1 },
    }),
    default_actions_components: mockTable([
      { entityId: 1n, actionIds: [actionIdOf("take")] },
    ]),
  };
  const { container } = render(<CustomizationPanel />, {
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
    appearance_features_components: mockTable([
      appearanceRow(9n, ["staff"]),
      appearanceRow(5n, ["sword"]),
    ]),
    ...groupTotals({ bodyCapacity: { hand: 2 } }),
  };
  const { container } = render(<CustomizationPanel />, {
    wrapper: gameWrapper(reversedRows, { identity: {} as Identity }),
  });
  const labels = [
    ...container.querySelectorAll(".defaultArmaments button"),
  ].map((button) => button.textContent!.split(" ")[0]);
  // Sorted by ENTITY id (5 sword, 9 staff), rendered by appearance name.
  expect(labels).toEqual(["sword", "staff"]);
});

test("a fifth relic renders visibly disabled at the four-cap", () => {
  const atCap = {
    ...tables(),
    // Four relic ENTITIES already worn; the owned charm would be a fifth.
    relics_components: mockTable([
      { entityId: 1n, relicEntityIds: [10n, 11n, 12n, 13n] },
    ]),
  };
  const { container } = render(<CustomizationPanel />, {
    wrapper: gameWrapper(atCap, { identity: {} as Identity }),
  });
  const charm = [...container.querySelectorAll(".relics button")].find((button) =>
    button.textContent!.startsWith("ember charm"),
  )!;
  expect(charm.hasAttribute("disabled")).toBe(true);
});

test("an equipped-but-unapplied item renders TEMPORARILY disabled, still removable", () => {
  // The jerkin (entity 6) is worn but the server reports it unapplied — a
  // capacity ran out. It stays on (worn) and clickable (removable), but is
  // struck through and labeled, never the :disabled attribute that would
  // trap it on.
  const setArmor = mock(() => {});
  const unapplied = {
    ...tables(),
    armor_components: mockTable([{ entityId: 1n, armorEntityId: 6n }]),
    equipment_disabled_components: mockTable([
      { entityId: 1n, disabledEntityIds: [6n] },
    ]),
  };
  const { container } = render(<CustomizationPanel />, {
    wrapper: gameWrapper(unapplied, {
      identity: {} as Identity,
      reducers: { setArmor },
    }),
  });
  const jerkin = [...container.querySelectorAll(".armor button")].find((button) =>
    button.textContent!.startsWith("leather jerkin"),
  )!;
  expect(jerkin.className).toContain("temporarilyDisabled");
  expect(jerkin.textContent).toContain("(disabled)");
  // Worn and still removable — NOT the html disabled attribute.
  expect(jerkin.hasAttribute("disabled")).toBe(false);
  fireEvent.click(jerkin);
  expect(setArmor).toHaveBeenCalled();
});

test("toggling a relic on proposes the extended relic set", () => {
  const setRelics = mock(() => {});
  const wrapper = gameWrapper(tables(), {
    identity: {} as Identity,
    reducers: { setRelics },
  });
  const { container } = render(<CustomizationPanel />, { wrapper });

  const charm = [...container.querySelectorAll(".relics button")].find((button) =>
    button.textContent!.startsWith("ember charm"),
  )!;
  fireEvent.click(charm);
  expect(setRelics).toHaveBeenCalledWith({
    relicEntityIds: [7n],
  });
});
