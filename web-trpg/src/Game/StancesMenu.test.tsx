import { test, expect, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import type { StatBlock } from "../stdb/types";
import {
  actionIdOf,
  armamentIdOf,
  mockTable,
  stanceIdOf,
} from "../testSupport/mockConnection";
import { gameWrapper } from "../testSupport/gameWrapper";
import { STANCE_DISPLAY_NAMES, StanceName } from "./assets/stances";
import { ARMAMENT_DISPLAY_NAMES, ArmamentName } from "./assets/armaments";
import { StancesMenu } from "./StancesMenu";

const runtimeStatBlock = (partial: Partial<StatBlock>): StatBlock => ({
  attack: 0,
  defense: 0,
  hand: 0,
  gait: 0,
  reach: 0,
  blunt: 0,
  bladed: 0,
  pole: 0,
  ward: 0,
  focus: 0,
  wing: 0,
  upright: 0,
  size: 0,
  morale: 0,
  mhp: 0,
  mep: 0,
  actionIds: [],
  appearanceFeatureIds: [],
  ...partial,
});

// The player (entity 1) stands with empty hands (grip 2); standing and
// dueling are REACHABLE through the stand and duel postures in their
// total's action grants. They carry a sword (entity 5, hand -1, assigned
// to dueling) and a spear (entity 8, hand -2, assigned nowhere).
const tables = () => ({
  player_controller_components: mockTable([{ entityId: 1n, accountId: 1n }]),
  total_stat_block_components: mockTable([
    {
      entityId: 1n,
      statBlock: runtimeStatBlock({
        hand: 2,
        actionIds: [actionIdOf("stand"), actionIdOf("duel")],
      }),
    },
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
  stance_customizations_components: mockTable([
    {
      entityId: 1n,
      assignments: [
        {
          stanceId: stanceIdOf("dueling"),
          armamentIds: [armamentIdOf("sword")],
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

const armamentLabel = (name: ArmamentName) => ARMAMENT_DISPLAY_NAMES[name];

test("shows exactly the REACHABLE stances, marking the active one", () => {
  const wrapper = gameWrapper(tables(), { identity: {} as Identity });
  const { container } = render(<StancesMenu />, { wrapper });

  // The card title reads the PROPER display name, never the raw key.
  expect(cardOf(container, "standing")?.querySelector("h3")?.textContent).toBe(
    "Standing (active)",
  );
  // Dueling is reachable through the duel posture — no "known" state
  // exists; reachability alone decides.
  expect(cardOf(container, "dueling")).toBeDefined();
  // No action anywhere in the seeds adopts perched: out of the menu.
  expect(cardOf(container, "perched")).toBeUndefined();
});

test("a stance with NO override lights 'use default' and shows the default items", () => {
  const withDefault = {
    ...tables(),
    default_armaments_components: mockTable([
      { entityId: 1n, armamentIds: [armamentIdOf("sword")] },
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
  expect(standing.textContent).toContain("Morale 1 (+1)");

  // Dueling OVERRIDES with its own sword assignment: same numbers, but by
  // override — its "use default" button is unlit.
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
      { entityId: 1n, armamentIds: [armamentIdOf("sword")] },
    ]),
  };
  const wrapper = gameWrapper(withDefault, {
    identity: {} as Identity,
    reducers: { assignStanceArmaments },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  // Standing rides the defaults: clicking its lit "use default" moves it
  // to a custom set with nothing assigned yet.
  const standing = cardOf(container, "standing")!;
  const standingUseDefault = [...standing.querySelectorAll("button")].find(
    (button) => button.textContent === "use default",
  )!;
  fireEvent.click(standingUseDefault);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("standing"),
    armamentIds: [],
  });

  // Dueling holds an override: clicking its unlit "use default" returns
  // it to the default set.
  const dueling = cardOf(container, "dueling")!;
  const duelingUseDefault = [...dueling.querySelectorAll("button")].find(
    (button) => button.textContent === "use default",
  )!;
  fireEvent.click(duelingUseDefault);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    armamentIds: undefined,
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
    default_armaments_components: mockTable([
      { entityId: 1n, armamentIds: [armamentIdOf("sword"), armamentIdOf("club")] },
    ]),
  };
  const wrapper = gameWrapper(twoDefaults, {
    identity: {} as Identity,
    reducers: { assignStanceArmaments },
  });
  const { container } = render(<StancesMenu />, { wrapper });

  // Standing rides the defaults; clicking the club (active by default)
  // copy-on-writes the visible set minus the club into a new override.
  const standing = cardOf(container, "standing")!;
  const club = [...standing.querySelectorAll("button")].find(
    (button) => button.textContent === armamentLabel("club"),
  )!;
  expect(club.className).toContain("active");
  fireEvent.click(club);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("standing"),
    armamentIds: [armamentIdOf("sword")],
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

  // Standing assigns no bar: the DEFAULT bar rides in, counted and shown.
  const standing = cardOf(container, "standing")!;
  expect(standing.textContent).toContain("Actions (1/10)");
  const chips = [...standing.querySelectorAll(".actionBar .actionChip")];
  expect(chips.map((chip) => chip.textContent)).toEqual(["j Take"]);

  // Two "use default" toggles per card now — armaments first, then the
  // bar's. Clicking the bar's while on defaults enters a BLANK custom bar.
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
  // parenthesized delta against the no-stance value.
  const dueling = cardOf(container, "dueling")!;
  expect(dueling.textContent).toContain("Attack 1 (+1)");
  expect(dueling.textContent).toContain("Hand 1 (-1)");
  expect(dueling.textContent).toContain("Morale 1 (+1)");
  // Proper display names, never the internal underscored key.
  expect(dueling.textContent).toContain("Grants: Lunge");
  // The category headings structure the list.
  expect(dueling.textContent).toContain("Combat");
  expect(dueling.textContent).toContain("Body");

  // Standing assigns nothing: bare-body totals — and a zero delta shows
  // NO parenthetical at all ("(0)" is noise, nowhere).
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
            armamentIds: [armamentIdOf("sword")],
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
  // Assigned actions live in the bar, not the candidates.
  const candidateLabels = [...dueling.querySelectorAll("button")]
    .filter((button) => !button.className.includes("actionChip"))
    .map((button) => button.textContent);
  expect(candidateLabels).not.toContain("Duel");

  // A plain tap removes, preserving the rest of the order.
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

  // Dueling's candidate set includes its own grant, lunge.
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
  expect(spear.disabled).toBe(true);

  // Clicking the equipped sword UNassigns it from this stance's customization.
  fireEvent.click(sword);
  expect(assignStanceArmaments).toHaveBeenCalledWith({
    stanceId: stanceIdOf("dueling"),
    armamentIds: [],
  });
});
