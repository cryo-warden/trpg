import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Button } from "./Button";

test("Button renders children with an uppercased hotkey badge and handles clicks", () => {
  let clicks = 0;
  const { getByRole } = render(
    <Button
      hotkey="a"
      onClick={() => {
        clicks += 1;
      }}
    >
      Go
    </Button>,
  );

  const button = getByRole("button");
  expect(button.className).toContain("Button");
  expect(button.textContent).toContain("Go");
  expect(button.textContent).toContain("A"); // hotkey badge, uppercased

  button.click();
  expect(clicks).toBe(1);
});
