import { test, expect, mock } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { gameWrapper } from "../testSupport/gameWrapper";
import { AutoEntryPanel } from "./AutoEntry";

test("AutoEntryPanel creates one generated dev account and says so", () => {
  const createAccount = mock(() => Promise.resolve());
  const { container, rerender } = render(<AutoEntryPanel />, {
    wrapper: gameWrapper(
      {},
      { identity: {} as Identity, reducers: { createAccount } },
    ),
  });

  expect(createAccount).toHaveBeenCalledTimes(1);
  const { name } = (createAccount.mock.calls[0] as unknown[])[0] as {
    name: string;
  };
  expect(name).toMatch(/^dev_[0-9a-z]+$/);
  expect(container.textContent).toContain(`Entering as ${name}`);

  // Re-render: still exactly one attempt — no loops.
  rerender(<AutoEntryPanel />);
  expect(createAccount).toHaveBeenCalledTimes(1);
});
