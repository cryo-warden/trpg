import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { Panel } from "./Panel";

test("Panel renders a div with the Panel class and a merged className", () => {
  const { container } = render(<Panel className="extra">content</Panel>);
  const div = container.firstElementChild as HTMLElement;
  expect(div.className).toBe("Panel extra");
  expect(div.textContent).toBe("content");
});
