import { test, expect } from "bun:test";
import { renderTemplate, type RenderValue } from "./template";
import { textMarkup } from "./textMarkup";

const passthrough: RenderValue<string, object, string> = (value, _rules, ctx) => [
  value,
  ctx,
];

const renderWith = (renderValue: RenderValue<string, object, string>) =>
  renderTemplate({ markup: textMarkup, renderValue });

test("fills positional slots and preserves surrounding literals", () => {
  const render = renderWith(passthrough);
  expect(render("{0} hits {1}.")(["Cat", "Dog"], {})).toBe("Cat hits Dog.");
});

test("renders a rule-free literal template verbatim", () => {
  const render = renderWith(passthrough);
  expect(render("just words")([], {})).toBe("just words");
});

test("passes each slot's rule set to the value renderer", () => {
  const render = renderWith((value, rules, ctx) => [
    rules.has("sentence") ? value.toUpperCase() : value,
    ctx,
  ]);
  expect(render("{0:sentence} and {1}")(["hi", "lo"], {})).toBe("HI and lo");
});

test("threads context from earlier slots to later ones", () => {
  type Ctx = { count: number };
  const render = renderTemplate<string, Ctx, string>({
    markup: textMarkup,
    renderValue: (value, _rules, ctx) => [
      `${value}${ctx.count}`,
      { count: ctx.count + 1 },
    ],
  });
  expect(render("{0}{1}")(["a", "b"], { count: 0 })).toBe("a0b1");
});
