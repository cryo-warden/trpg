import { test, expect } from "bun:test";
import {
  createNarrationRenderValue,
  initialNarrationContext,
  SENTENCE_RULE,
  SUBJECT_RULE,
} from "./narration";
import { textMarkup } from "../../renderer/textMarkup";

const render = createNarrationRenderValue({
  markup: textMarkup,
  getName: ({ named }) => (typeof named === "bigint" ? "goblin" : String(named)),
  getClassName: () => "entity",
});

test("passes literal (non-entity) values straight through as text", () => {
  const [node, context] = render(" hits ", new Set(), initialNarrationContext);
  expect(node).toBe(" hits ");
  expect(context).toEqual(initialNarrationContext);
});

test("names an entity value via the injected getName", () => {
  const [node] = render(5n, new Set(), initialNarrationContext);
  expect(node).toBe("goblin");
});

test("capitalizes the name under the sentence rule", () => {
  const [node] = render(5n, new Set([SENTENCE_RULE]), initialNarrationContext);
  expect(node).toBe("Goblin");
});

test("records the entity as the current subject under the subject rule", () => {
  const [, context] = render(
    5n,
    new Set([SUBJECT_RULE]),
    initialNarrationContext,
  );
  expect(context.subject).toBe(5n);
});
