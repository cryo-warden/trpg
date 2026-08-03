import { Markup } from "./markup";

type TemplateNode =
  | {
      type: "value";
      index: number;
      ruleSet: Set<string>;
      next?: TemplateNode;
    }
  | {
      type: "literal";
      literal: string;
      next?: TemplateNode;
    };

const matchRegExp = /([^{]*)\{([^}]+)\}(.*)/;
const ruleRegExp = /([^:]+)(?::(.*))/;

const lex = (template: string): TemplateNode => {
  const match = matchRegExp.exec(template);
  if (match == null) {
    return {
      type: "literal",
      literal: template,
    };
  }

  const [, left, middle, right] = match;
  const [, value, rules] = ruleRegExp.exec(middle) ?? ["", middle, ""];

  const valueNode: TemplateNode = {
    type: "value",
    index: Number.parseInt(value),
    ruleSet: new Set(rules.split(":")),
    next: right.length > 0 ? lex(right) : void 0,
  };

  if (left.length > 0) {
    return {
      type: "literal",
      literal: left,
      next: valueNode,
    };
  }

  return valueNode;
};

/**
 * Lexing a template is pure and independent of the {@link Markup} or value
 * renderer, so parsed templates are cached module-wide and reused across
 * renders — no per-render mutable cache (and thus no React state) is needed.
 */
const lexCache = new Map<string, TemplateNode>();

const parseTemplate = (template: string): TemplateNode => {
  const cached = lexCache.get(template);
  if (cached != null) {
    return cached;
  }
  const root = lex(template);
  lexCache.set(template, root);
  return root;
};

/**
 * Turns a single template value into an output node, threading a context so
 * that later values can react to earlier ones (e.g. grammatical subject). The
 * node type is whatever the injected {@link Markup} produces, so this is
 * framework-agnostic.
 */
export type RenderValue<T, TContext, Node> = (
  value: T,
  rules: Set<string>,
  context: TContext,
) => [Node, TContext];

/**
 * Compiles positional templates like `"{0:sentence:subject} hit {1:object}."`
 * into a renderer. Literals and value substitutions are assembled purely
 * through the injected {@link Markup}, so the same template produces React
 * nodes or plain text depending only on which `Markup` is supplied.
 */
export const renderTemplate = <T, TContext, Node>({
  markup,
  renderValue,
}: {
  markup: Markup<Node>;
  renderValue: RenderValue<T, TContext, Node>;
}) => {
  const renderNode = (
    templateNode: TemplateNode,
    values: T[],
    context: TContext,
  ): Node => {
    switch (templateNode.type) {
      case "literal": {
        const next =
          templateNode.next == null
            ? markup.empty
            : renderNode(templateNode.next, values, context);
        return markup.join([markup.text(templateNode.literal), next]);
      }
      case "value": {
        const [node, nextContext] = renderValue(
          values[templateNode.index],
          templateNode.ruleSet,
          context,
        );
        const next =
          templateNode.next == null
            ? markup.empty
            : renderNode(templateNode.next, values, nextContext);
        return markup.join([node, next]);
      }
    }
  };

  return (template: string) => {
    const templateRoot = parseTemplate(template);
    return (values: T[], context: TContext): Node =>
      renderNode(templateRoot, values, context);
  };
};
