import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { TurnPauseOverlayView } from "./TurnPauseOverlay";

test("the overlay is present but hidden until the turn pauses", () => {
  const { container, rerender } = render(<TurnPauseOverlayView paused={false} />);
  const overlay = container.querySelector(".TurnPauseOverlay")!;
  expect(overlay.classList.contains("visible")).toBe(false);
  expect(overlay.getAttribute("aria-hidden")).toBe("true");

  rerender(<TurnPauseOverlayView paused={true} />);
  expect(overlay.classList.contains("visible")).toBe(true);
  expect(overlay.getAttribute("aria-hidden")).toBe("false");
});
