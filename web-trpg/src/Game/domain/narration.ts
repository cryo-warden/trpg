import { EntityId } from "../trpg";
import { Markup } from "../../renderer/markup";
import { RenderValue } from "../../renderer/template";

/**
 * Language-neutral narration toolkit: the mechanism a {@link
 * ../../renderer/language.Language} is built from, with none of the actual
 * words. It defines the template-slot contract (the `{n:rule:rule}` rule
 * tokens that game assets embed), the grammar state threaded across a
 * sentence, and a reusable subject/object render-value builder. The English
 * sentences and word choices live in the individual language modules
 * (`renderer/en-us.ts`, `renderer/debug.ts`), not here.
 *
 * Framework-free — the only rendering dependency is the abstract {@link Markup}
 * seam, so the same toolkit serves React on the web and plain text in a CLI
 * player.
 */

/** A template substitution value: an entity to name, or literal text. */
export type NarrationValue = EntityId | string;

/** A chosen sentence template plus the values that fill its `{n}` slots. */
export type Narration = {
  template: string;
  values: NarrationValue[];
};

/** Rendering rule tokens carried in a template slot, e.g. `{0:sentence:subject}`. */
export const SUBJECT_RULE = "subject";
export const OBJECT_RULE = "object";
export const SENTENCE_RULE = "sentence";

/** Tracks the current grammatical subject/object as a sentence is rendered. */
export type NarrationContext = {
  subject: EntityId | null;
  object: EntityId | null;
};

export const initialNarrationContext: NarrationContext = {
  subject: null,
  object: null,
};

const capitalize = (word: string): string =>
  word.substring(0, 1).toUpperCase() + word.substring(1);

export type NarrationName = (input: {
  named: NarrationValue | undefined;
  subject?: NarrationValue | undefined;
}) => string | null;

export type NarrationClassName = (
  entity: NarrationValue | undefined,
) => string;

/**
 * Builds the per-value renderer for narration templates. Entity values are
 * named (respecting subject/object grammar and sentence capitalization) and
 * emitted as styled text; literal values pass through as text. All output goes
 * through the injected {@link Markup}, so this holds no React and no plain
 * strings — it is the shared grammar a language reuses (and that the debug
 * language may wrap to add logging).
 */
export const createNarrationRenderValue = <Node>({
  markup,
  getName,
  getClassName,
}: {
  markup: Markup<Node>;
  getName: NarrationName;
  getClassName: NarrationClassName;
}): RenderValue<NarrationValue, NarrationContext, Node> => {
  return (value, ruleSet, context) => {
    if (typeof value !== "bigint") {
      return [markup.text(value), context];
    }

    const nextContext: NarrationContext = ruleSet.has(SUBJECT_RULE)
      ? { ...context, subject: value }
      : ruleSet.has(OBJECT_RULE)
        ? { ...context, object: value }
        : context;

    const name =
      getName({
        named: value,
        subject: ruleSet.has(OBJECT_RULE)
          ? (context.subject ?? undefined)
          : undefined,
      }) ?? "";

    const text = ruleSet.has(SENTENCE_RULE) ? capitalize(name) : name;

    return [
      markup.styled(getClassName(value), markup.text(text)),
      {
        ...nextContext,
        object: ruleSet.has(SENTENCE_RULE) ? null : nextContext.object,
      },
    ];
  };
};
