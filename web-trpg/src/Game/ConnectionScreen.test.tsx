import { test, expect } from "bun:test";
import { render } from "@testing-library/react";
import { ConnectionScreen } from "./ConnectionScreen";

test("connecting state shows the address being dialed", () => {
  const { container } = render(
    <ConnectionScreen
      status="connecting"
      uri="ws://localhost:3000"
      detail={null}
    />,
  );
  expect(container.textContent).toContain("Connecting");
  expect(container.textContent).toContain("ws://localhost:3000");
});

test("error state shows the address, the failure, and a retry", () => {
  const { container } = render(
    <ConnectionScreen
      status="error"
      uri="wss://example.test:3090"
      detail="Error: connection refused"
    />,
  );
  expect(container.textContent).toContain("Cannot reach the game server");
  expect(container.textContent).toContain("wss://example.test:3090");
  expect(container.textContent).toContain("connection refused");
  expect(container.querySelector("button")?.textContent).toBe("Retry");
});

test("a configuration failure renders even with no address resolved", () => {
  const { container } = render(
    <ConnectionScreen
      status="error"
      uri={null}
      detail="Error: TRPG_STDB_PORT was not set at build time"
    />,
  );
  expect(container.textContent).toContain("Cannot reach the game server");
  expect(container.textContent).toContain("TRPG_STDB_PORT was not set");
});
