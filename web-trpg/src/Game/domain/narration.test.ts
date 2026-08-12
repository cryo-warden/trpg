import { test, expect } from "bun:test";
import {
  createNarrationRenderValue,
  initialNarrationContext,
  POSSESSIVE_RULE,
  SENTENCE_RULE,
  SUBJECT_RULE,
} from "./narration";
import { textMarkup } from "../../renderer/textMarkup";

const render = createNarrationRenderValue({
  markup: textMarkup,
  getName: ({ named }) => (typeof named === "bigint" ? "goblin" : String(named)),
  getClassName: () => "entity",
  getPossessive: (named) => (named === 7n ? "your" : "its"),
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

test("renders the possessive pronoun under the possessive rule", () => {
  const [viewer] = render(
    7n,
    new Set([POSSESSIVE_RULE]),
    initialNarrationContext,
  );
  expect(viewer).toBe("your");
  const [other] = render(
    5n,
    new Set([POSSESSIVE_RULE]),
    initialNarrationContext,
  );
  expect(other).toBe("its");
});

test("capitalizes a sentence-initial possessive", () => {
  const [node] = render(
    5n,
    new Set([POSSESSIVE_RULE, SENTENCE_RULE]),
    initialNarrationContext,
  );
  expect(node).toBe("Its");
});

test("records the entity as the current subject under the subject rule", () => {
  const [, context] = render(
    5n,
    new Set([SUBJECT_RULE]),
    initialNarrationContext,
  );
  expect(context.subject).toBe(5n);
});
