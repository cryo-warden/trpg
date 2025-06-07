import { ReactNode } from "react";

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

const matchRegExp = /([^\{]*)\{([^}]+)\}(.*)/;
const ruleRegExp = /([^:])+(?::(.*))/;

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
    next: lex(right),
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

// type ApplyRules = (text: string) => string;
// const applyRules =
//   (rules: string[]): ApplyRules =>
//   (text) => {
//     return rules.reduce((text, rule) => {
//       if (rule === "sentence") {
//         return text[0].toUpperCase() + text.substring(1);
//       }
//       if (rule === "subject") {
//         return text;
//       }
//       if (rule === "object") {
//         return text;
//       }
//       return text;
//     }, text);
//   };

export type RenderValue<T, TContext> = (
  value: T,
  rules: Set<string>,
  context: TContext
) => [ReactNode, TContext];

const renderTemplateNode = <T, TContext>(
  renderValue: RenderValue<T, TContext>
) => {
  return (values: T[]) => {
    const renderTemplateNode = (
      templateNode: TemplateNode,
      context: TContext
    ): ReactNode => {
      switch (templateNode.type) {
        case "literal": {
          const next =
            templateNode.next == null
              ? null
              : renderTemplateNode(templateNode.next, context);
          return (
            <>
              {templateNode.literal}
              {next}
            </>
          );
        }
        case "value": {
          const [node, nextContext] = renderValue(
            values[templateNode.index],
            templateNode.ruleSet,
            context
          );
          const next =
            templateNode.next == null
              ? null
              : renderTemplateNode(templateNode.next, nextContext);
          return (
            <>
              {node}
              {next}
            </>
          );
        }
      }
    };
    return renderTemplateNode;
  };
};

export const renderTemplate = <T, TContext>(
  renderValue: RenderValue<T, TContext>
) => {
  return (template: string) => {
    const templateRoot = lex(template);
    return (values: T[], context: TContext): ReactNode => {
      return renderTemplateNode(renderValue)(values)(templateRoot, context);
    };
  };
};
