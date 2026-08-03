import { test, expect } from "bun:test";
import { render, fireEvent } from "@testing-library/react";
import { Scroller } from "./Scroller";

test("Scroller renders its children inside a scroll area", () => {
  const { container, getByText } = render(<Scroller className="x">body</Scroller>);
  expect(container.querySelector(".Scroller.x")).not.toBeNull();
  expect(getByText("body")).not.toBeNull();

  // Firing a scroll exercises the scroll handler without throwing.
  const area = container.querySelector(".scrollArea") as HTMLElement;
  fireEvent.scroll(area);
});
