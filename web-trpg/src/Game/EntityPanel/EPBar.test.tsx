import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { mockTable, stdbWrapper } from "../../testSupport/mockConnection";
import { EPBar } from "./EPBar";

test("EPBar shows the entity's current and max ep", () => {
  const wrapper = stdbWrapper({
    ep_components: mockTable([{ entityId: 1n, ep: 4, mep: 6 }]),
  });
  const { container } = render(<EPBar entity={1n} />, { wrapper });
  expect(container.textContent).toContain("4 / 6 EP");
});

test("EPBar renders nothing when the entity has no ep component", () => {
  const wrapper = stdbWrapper({ ep_components: mockTable([]) });
  const { container } = render(<EPBar entity={1n} />, { wrapper });
  expect(container.textContent).toBe("");
});
