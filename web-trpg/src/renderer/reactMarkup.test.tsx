import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { reactMarkup } from "./reactMarkup";

test("reactMarkup renders text, styled spans, and joined nodes", () => {
  const { container } = render(
    <>
      {reactMarkup.join([
        reactMarkup.text("hi "),
        reactMarkup.styled("foe", reactMarkup.text("goblin")),
      ])}
    </>,
  );
  expect(container.textContent).toBe("hi goblin");
  expect(container.querySelector("span.foe")?.textContent).toBe("goblin");
});

test("reactMarkup.empty renders nothing", () => {
  const { container } = render(<>{reactMarkup.empty}</>);
  expect(container.textContent).toBe("");
});
