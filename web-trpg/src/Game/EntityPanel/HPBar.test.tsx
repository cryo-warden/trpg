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
