import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { mockTable, stdbWrapper } from "../../testSupport/mockConnection";
import { HPBar } from "./HPBar";

test("HPBar shows the entity's current and max hp", () => {
  const wrapper = stdbWrapper({
    hp_components: mockTable([{ entityId: 1n, hp: 7, mhp: 10 }]),
  });
  const { container } = render(<HPBar entity={1n} />, { wrapper });
  expect(container.textContent).toContain("7 / 10 HP");
});

test("HPBar renders nothing when the entity has no hp component", () => {
  const wrapper = stdbWrapper({ hp_components: mockTable([]) });
  const { container } = render(<HPBar entity={1n} />, { wrapper });
  expect(container.textContent).toBe("");
});

test("HPBar hides a non-actor's bar while it is at full health", () => {
  // Scenery is a physical object with hit points, but an intact one shows no
  // bar — no clutter over undamaged props.
  const wrapper = stdbWrapper({
    hp_components: mockTable([{ entityId: 1n, hp: 10, mhp: 10 }]),
  });
  const { container } = render(<HPBar entity={1n} />, { wrapper });
  expect(container.textContent).toBe("");
});

test("HPBar shows a non-actor's bar once it has taken damage", () => {
  const wrapper = stdbWrapper({
    hp_components: mockTable([{ entityId: 1n, hp: 6, mhp: 10 }]),
  });
  const { container } = render(<HPBar entity={1n} />, { wrapper });
  expect(container.textContent).toContain("6 / 10 HP");
});

test("HPBar always shows an actor's bar, even at full health", () => {
  // A threat's health is information you want, undamaged or not.
  const wrapper = stdbWrapper({
    hp_components: mockTable([{ entityId: 1n, hp: 10, mhp: 10 }]),
    enemy_controller_components: mockTable([{ entityId: 1n }]),
  });
  const { container } = render(<HPBar entity={1n} />, { wrapper });
  expect(container.textContent).toContain("10 / 10 HP");
});
