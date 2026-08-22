import { test, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import {
  actionIdOf,
  appearanceFeatureIndexOf,
  armamentIdOf,
  mockTable,
  stanceIdOf,
} from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { STANCE_DISPLAY_NAMES, StanceName } from "./assets/stances";
import { AppearanceFeatureName } from "./assets/appearance_features";
import { StancesMenu } from "./StancesMenu";

// Each item ENTITY names itself by its own appearance features.
const appearanceRow = (entityId: bigint, names: AppearanceFeatureName[]) => ({
  entityId,
  appearanceFeatureIndexes: names.map(appearanceFeatureIndexOf),
});

// The player (entity 1) is a two-handed, two-footed body (grip 2) with a
// fighter's nerve. Reachability keys off READINESS now, not granted action
// lists: standing is reachable through the body's `foot`, and dueling through
// that `foot` plus the `bladed` the carried sword could add. They carry a sword
// (entity 5, hand -1, assigned to dueling) and a spear (entity 8, hand -2,
// assigned nowhere).
const tables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  stats_total_components: mockTable([{ entityId: 1n, stats: {} }]),
  readiness_total_components: mockTable([
    { entityId: 1n, readiness: { morale: 3, hand: 2, foot: 2 } },
  ]),
  body_capacity_total_components: mockTable([
    { entityId: 1n, bodyCapacity: { hand: 2 } },
  ]),
  active_stance_components: mockTable([
    { entityId: 1n, stanceId: stanceIdOf("standing") },
  ]),
  location_components: mockTable([
    { entityId: 5n, locationEntityId: 1n },
    { entityId: 8n, locationEntityId: 1n },
  ]),
  item_components: mockTable([
    { entityId: 5n, itemRef: { tag: "Armament", value: armamentIdOf("sword") } },
    { entityId: 8n, itemRef: { tag: "Armament", value: armamentIdOf("spear") } },
  ]),
  appearance_features_components: mockTable([
    appearanceRow(5n, ["sword"]),
    appearanceRow(8n, ["spear"]),
  ]),
  stance_customizations_components: mockTable([
    {
      entityId: 1n,
      assignments: [
        {
          stanceId: stanceIdOf("dueling"),
          armamentEntityIds: [5n],
          actionIds: [],
        },
      ],
    },
  ]),
});

// Tests name stances by their raw key; the card renders the DISPLAY name,
// so resolve before matching.
const cardOf = (container: HTMLElement, stance: StanceName) =>
  [...container.querySelectorAll(".stanceCard")].find((card) =>
    card
      .querySelector("h3")!
      .textContent!.startsWith(STANCE_DISPLAY_NAMES[stance]),
  );

// Armament buttons render the item ENTITY's appearance name.
const armamentLabel = (name: "sword" | "spear" | "club" | "staff") => name;

test("shows exactly the REACHABLE stances, marking the active one", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  expect(cardOf(container, "standing")?.querySelector("h3")?.textContent).toBe(
    "Standing (active)",
  );
  expect(cardOf(container, "dueling")).toBeDefined();
  expect(cardOf(container, "perched")).toBeUndefined();
});

test("a stance with NO override lights 'use default' and shows the default items", () => {
  const withDefault = {
    ...tables(),
    default_armaments_components: mockTable([
      { entityId: 1n, armamentEntityIds: [5n] },
    ]),
  };
  const wrapper = gameWrapper(withDefault, { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  // Standing assigns nothing: the default sword rides its totals, the
  // "use default" button is lit, and the default item shows highlighted.
  const standing = cardOf(container, "standing")!;
  const standingButtons = [...standing.querySelectorAll("button")];
  const useDefault = standingButtons.find(
    (button) => button.textContent === "use default",
  )!;
  expect(useDefault.className).toContain("active");
  const standingSword = standingButtons.find(
    (button) => button.textContent === armamentLabel("sword"),
  )!;
  expect(standingSword.className).toContain("active");
  expect(standing.textContent).toContain("Hand 1 (-1)");
  expect(standing.textContent).toContain("Morale 4 (+1)");

  // Dueling OVERRIDES with its own sword assignment: its "use default"
  // button is unlit.
  const dueling = cardOf(container, "dueling")!;
  const duelingUseDefault = [...dueling.querySelectorAll("button")].find(
    (button) => button.textContent === "use default",
  )!;
  expect(duelingUseDefault.className).not.toContain("active");
});

test("'use default' toggles: active proposes an EMPTY custom set, an override proposes the default", () => {
  const assignStanceArmaments = mock(() => {});
  const withDefault = {
    ...tables(),
    default_armaments_components: mockTable([
      { entityId: 1n, armamentEntityIds: [5n] },
    ]),
  };
  const wrapper = gameWrapper(withDefault, {
    identity: {} as Identity,
    reducers: { assignStanceArmaments },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  const standing = cardOf(container, "standing")!;
  const standingUseDefault = [...standing.querySelectorAll("button")].find(
    (button) => button.textContent === "use default",
  )!;
  fireEvent.click(standingUseDefault);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("standing"),
    armamentEntityIds: [],
  });

  const dueling = cardOf(container, "dueling")!;
  const duelingUseDefault = [...dueling.querySelectorAll("button")].find(
    (button) => button.textContent === "use default",
  )!;
  fireEvent.click(duelingUseDefault);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    armamentEntityIds: undefined,
  });
});

test("clicking an active-by-default item enters custom mode WITHOUT it, keeping the rest", () => {
  const assignStanceArmaments = mock(() => {});
  const twoDefaults = {
    ...tables(),
    location_components: mockTable([
      { entityId: 5n, locationEntityId: 1n },
      { entityId: 6n, locationEntityId: 1n },
    ]),
    item_components: mockTable([
      { entityId: 5n, itemRef: { tag: "Armament", value: armamentIdOf("sword") } },
      { entityId: 6n, itemRef: { tag: "Armament", value: armamentIdOf("club") } },
    ]),
    appearance_features_components: mockTable([
      appearanceRow(5n, ["sword"]),
      appearanceRow(6n, ["club"]),
    ]),
    default_armaments_components: mockTable([
      { entityId: 1n, armamentEntityIds: [5n, 6n] },
    ]),
  };
  const wrapper = gameWrapper(twoDefaults, {
    identity: {} as Identity,
    reducers: { assignStanceArmaments },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  const standing = cardOf(container, "standing")!;
  const club = [...standing.querySelectorAll("button")].find(
    (button) => button.textContent === armamentLabel("club"),
  )!;
  expect(club.className).toContain("active");
  fireEvent.click(club);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("standing"),
    armamentEntityIds: [5n],
  });
});

test("a stance with no bar of its own rides the DEFAULT bar; its toggle enters a blank custom bar", () => {
  const assignStanceActions = mock(() => {});
  const withDefaultBar = {
    ...tables(),
    default_actions_components: mockTable([
      { entityId: 1n, actionIds: [actionIdOf("take")] },
    ]),
  };
  const wrapper = gameWrapper(withDefaultBar, {
    identity: {} as Identity,
    reducers: { assignStanceActions },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  const standing = cardOf(container, "standing")!;
  expect(standing.textContent).toContain("Actions (1/10)");
  const chips = [...standing.querySelectorAll(".actionBar .actionChip")];
  expect(chips.map((chip) => chip.textContent)).toEqual(["j Take"]);

  const useDefaultButtons = [...standing.querySelectorAll("button")].filter(
    (button) => button.textContent === "use default",
  );
  expect(useDefaultButtons.length).toBe(2);
  fireEvent.click(useDefaultButtons[1]!);
  expect(assignStanceActions).toHaveBeenCalledWith({
    stanceId: stanceIdOf("standing"),
    actionIds: [],
  });
});

test("gallery dots: one per reachable stance, the active stance marked", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  const dots = [...container.querySelectorAll(".dots button")];
  expect(dots.length).toBe(container.querySelectorAll(".stanceCard").length);
  const standingDot = dots.find(
    (dot) => dot.getAttribute("aria-label") === STANCE_DISPLAY_NAMES.standing,
  )!;
  expect(standingDot.className).toContain("activeStance");
});

test("cards show categorized totals with deltas from the no-stance base", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  // Dueling with the assigned sword: base attack 0 + stance 1, base hand 2
  // + sword -1, and the sword's own morale ride along — each with its
  // parenthesized delta against the geared no-stance base.
  const dueling = cardOf(container, "dueling")!;
  expect(dueling.textContent).toContain("Attack 1 (+1)");
  expect(dueling.textContent).toContain("Hand 1 (-1)");
  expect(dueling.textContent).toContain("Morale 4 (+1)");
  // Actions DERIVE from readiness now (no more "Grants:" line): the assigned
  // sword's `bladed` plus the committed-act morale surface Lunge as a candidate
  // button, named by its proper display name, never the underscored key.
  expect(
    [...dueling.querySelectorAll("button")].some(
      (button) => button.textContent === "Lunge",
    ),
  ).toBe(true);
  expect(dueling.textContent).toContain("Combat");
  expect(dueling.textContent).toContain("Body");

  // Standing assigns nothing: bare-body totals — and a zero delta shows
  // NO parenthetical at all.
  const standing = cardOf(container, "standing")!;
  expect(standing.textContent).toContain("Hand 2");
  expect(standing.textContent).toContain("Attack 0");
  expect(standing.textContent).not.toContain("(0)");
});

test("the bar lists assigned actions in hotkey order; a tap removes", () => {
  const assignStanceActions = mock(() => {});
  const withBar = {
    ...tables(),
    stance_customizations_components: mockTable([
      {
        entityId: 1n,
        assignments: [
          {
            stanceId: stanceIdOf("dueling"),
            armamentEntityIds: [5n],
            actionIds: [actionIdOf("duel"), actionIdOf("stand")],
          },
        ],
      },
    ]),
  };
  const wrapper = gameWrapper(withBar, {
    identity: {} as Identity,
    reducers: { assignStanceActions },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  const dueling = cardOf(container, "dueling")!;
  const chips = [...dueling.querySelectorAll(".actionBar .actionChip")];
  expect(chips.map((chip) => chip.textContent)).toEqual([
    "j Duel",
    "k Stand",
  ]);
  const candidateLabels = [...dueling.querySelectorAll("button")]
    .filter((button) => !button.className.includes("actionChip"))
    .map((button) => button.textContent);
  expect(candidateLabels).not.toContain("Duel");

  fireEvent.click(chips[0]);
  expect(assignStanceActions).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    actionIds: [actionIdOf("stand")],
  });
});

test("assigning an action pins it into the stance's bar order", () => {
  const assignStanceActions = mock(() => {});
  const wrapper = gameWrapper(tables(), {
    identity: {} as Identity,
    reducers: { assignStanceActions },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  const dueling = cardOf(container, "dueling")!;
  const lunge = [...dueling.querySelectorAll("button")].find((button) =>
    button.textContent!.includes("Lunge"),
  )!;
  fireEvent.click(lunge);
  expect(assignStanceActions).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    actionIds: [actionIdOf("lunge")],
  });
});

test("assigned armaments highlight and unassign; overweight ones disable", () => {
  const assignStanceArmaments = mock(() => {});
  const wrapper = gameWrapper(tables(), {
    identity: {} as Identity,
    reducers: { assignStanceArmaments },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  const dueling = cardOf(container, "dueling")!;
  const buttons = [...dueling.querySelectorAll("button")];
  const sword = buttons.find((b) => b.textContent === armamentLabel("sword"))!;
  const spear = buttons.find((b) => b.textContent === armamentLabel("spear"))!;

  expect(sword.className).toContain("active");
  // Grip 2, sword already holds 1: the two-handed spear cannot also fit.
  expect(spear.hasAttribute("disabled")).toBe(true);

  // Clicking the equipped sword UNassigns it from this stance's customization.
  fireEvent.click(sword);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    armamentEntityIds: [],
  });
});
