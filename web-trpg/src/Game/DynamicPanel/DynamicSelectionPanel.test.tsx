import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import type { DynamicPanelMode } from "../context/DynamicPanelContext";
import { gameWrapper } from "../../testSupport/gameWrapper";
import { DynamicSelectionPanel } from "./DynamicSelectionPanel";

test("DynamicSelectionPanel switches the dynamic panel mode on click", () => {
  const modes: DynamicPanelMode[] = [];
  // target: null bypasses TargetProvider (no player tables needed here).
  const wrapper = gameWrapper(
    {},
    { setMode: (m) => modes.push(m), target: null },
  );
  const { getByText } = render(<DynamicSelectionPanel />, { wrapper });

  getByText("Items").click();
  getByText("Stats").click();
  getByText("Room").click();
  getByText("Equipment").click();

  expect(modes).toEqual(["inventory", "stats", "location", "equipment"]);
});
