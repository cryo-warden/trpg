import { test, expect, mock } from "bun:test";
import { render } from "@testing-library/react";
import type { Identity } from "spacetimedb";
import { gameWrapper } from "../testSupport/gameWrapper";
import { mockTable } from "../testSupport/mockConnection";
import { AutoEntryPanel } from "./AutoEntry";

test("AutoEntryPanel creates one generated dev account and says so", () => {
  const createAccount = mock(() => Promise.resolve());
  const pushAssets = mock(() => Promise.resolve());
  const { container, rerender } = render(<AutoEntryPanel />, {
    wrapper: gameWrapper(
      {},
      { identity: {} as Identity, reducers: { createAccount, pushAssets } },
    ),
  });

  expect(createAccount).toHaveBeenCalledTimes(1);
  const { name } = (createAccount.mock.calls[0] as unknown[])[0] as {
    name: string;
  };
  expect(name).toMatch(/^dev_[0-9a-z]+$/);
  expect(container.textContent).toContain(`Entering as ${name}`);
  // Assets already exist (the mock asset tables): no bootstrap push.
  expect(pushAssets).toHaveBeenCalledTimes(0);

  // Re-render: still exactly one attempt — no loops.
  rerender(<AutoEntryPanel />);
  expect(createAccount).toHaveBeenCalledTimes(1);
});

test("AutoEntryPanel bootstraps an EMPTY instance with the asset bundle", () => {
  const createAccount = mock(() => Promise.resolve());
  const pushAssets = mock(() => Promise.resolve());
  render(<AutoEntryPanel />, {
    wrapper: gameWrapper(
      { actions: mockTable([]) },
      { identity: {} as Identity, reducers: { createAccount, pushAssets } },
    ),
  });

  // No assets anywhere: without a push, no player could ever provision.
  expect(pushAssets).toHaveBeenCalledTimes(1);
  expect(createAccount).toHaveBeenCalledTimes(1);
});
