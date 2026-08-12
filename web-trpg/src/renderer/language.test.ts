import { test, expect } from "bun:test";
import type { EntityEvent } from "../stdb/types";
import type { NarrationName } from "../Game/domain/narration";
import { ACTIONS, ACTION_APPEARANCES } from "../Game/assets/actions";
import { textMarkup } from "./textMarkup";
import { renderEventWith } from "./language";
import { createEnUs } from "./en-us";
import { createDebug } from "./debug";

// The test plays both roles: ids follow the Records' enumeration order (as
// push_assets interns them), and actionAppearanceOf is the id -> vocabulary
// resolution the hooks normally provide from the subscribed actions table.
const orderedNames = Object.keys(ACTIONS) as (keyof typeof ACTIONS)[];
const languageDeps = {
  actionAppearanceOf: (id: number) => {
    const name = orderedNames[id];
    return name == null ? null : ACTION_APPEARANCES[name];
  },
};
const bopId = orderedNames.indexOf("bop");

const names: Record<string, string> = { "1": "the goblin", "2": "the hero" };
const getName: NarrationName = ({ named }) =>
  typeof named === "bigint"
    ? (names[named.toString()] ?? `entity ${named}`)
    : String(named ?? "");
const getClassName = () => "entity";
const getPossessive = (named: unknown) => (named === 1n ? "its" : "their");

const actionEffect = (effect: { tag: string; value?: number }): EntityEvent =>
  ({
    ownerEntityId: 1n,
    targetEntityId: 2n,
    eventType: { tag: "ActionEffect", value: effect },
  }) as unknown as EntityEvent;

const startAction = (actionId: number): EntityEvent =>
  ({
    ownerEntityId: 1n,
    targetEntityId: 2n,
    eventType: { tag: "StartAction", value: actionId },
  }) as unknown as EntityEvent;

const unknownEvent = (): EntityEvent =>
  ({
    ownerEntityId: 1n,
    targetEntityId: 2n,
    eventType: { tag: "SomethingUnnarrated", value: 0 },
  }) as unknown as EntityEvent;

// en-us and debug are intentionally identical copies; cover both.
for (const [label, language] of [
  ["en-us", createEnUs(languageDeps)],
  ["debug", createDebug(languageDeps)],
] as const) {
  const render = renderEventWith({
    language,
    markup: textMarkup,
    getName,
    getClassName,
    getPossessive,
  });

  test(`${label}: narrates an attack, capitalizing the subject and inlining damage`, () => {
    expect(render(actionEffect({ tag: "Attack", value: 3 }))).toBe(
      "The goblin dealt 3 damage to the hero!",
    );
  });

  test(`${label}: narrates a heal with its amount`, () => {
    expect(render(actionEffect({ tag: "Heal", value: 5 }))).toBe(
      "The goblin healed the hero for 5.",
    );
  });

  test(`${label}: narrates move/take/drop/equip/unequip`, () => {
    expect(render(actionEffect({ tag: "Move" }))).toBe(
      "The goblin moved through the hero.",
    );
    expect(render(actionEffect({ tag: "Take" }))).toBe(
      "The goblin took the hero.",
    );
    expect(render(actionEffect({ tag: "Drop" }))).toBe(
      "The goblin dropped the hero.",
    );
    expect(render(actionEffect({ tag: "Equip" }))).toBe(
      "The goblin equipped the hero.",
    );
    expect(render(actionEffect({ tag: "Unequip" }))).toBe(
      "The goblin unequipped the hero.",
    );
  });

  test(`${label}: does not narrate buff or unknown events`, () => {
    expect(render(actionEffect({ tag: "Buff" }))).toBeNull();
    expect(render(unknownEvent())).toBeNull();
  });

  test(`${label}: renders StartAction with the action's begin template`, () => {
    expect(render(startAction(bopId))).toBe(
      "The goblin wound up to bop the hero.",
    );
  });

  test(`${label}: falls back to a default template for an unknown action`, () => {
    expect(render(startAction(9999))).toBe(
      "The goblin began a mysterious action toward the hero.",
    );
  });
}
