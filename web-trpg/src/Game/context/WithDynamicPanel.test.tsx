import { test, expect } from "bun:test";
import { act, render } from "@testing-library/react";
import { WithDynamicPanel } from "./WithDynamicPanel";
import {
  useDynamicPanelMode,
  useSetDynamicPanelMode,
} from "./DynamicPanelContext";

const Probe = () => {
  const mode = useDynamicPanelMode();
  const setMode = useSetDynamicPanelMode();
  return <button onClick={() => setMode("stats")}>{mode}</button>;
};

test("WithDynamicPanel provides mode state that updates via setMode", () => {
  const { container } = render(
    <WithDynamicPanel>
      <Probe />
    </WithDynamicPanel>,
  );
  const button = container.querySelector("button") as HTMLButtonElement;
  expect(button.textContent).toBe("location");

  act(() => button.click());
  expect(button.textContent).toBe("stats");
});
