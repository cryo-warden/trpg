import { EntityEvent } from "../stdb/types";
import { Markup } from "./markup";
import { renderTemplate, RenderValue } from "./template";
import {
  Narration,
  NarrationClassName,
  NarrationName,
  NarrationValue,
} from "../Game/domain/narration";

/**
 * A swappable language plugin.
 *
 * PLANNED FEATURE: players will eventually choose their language, and the app
 * will select the matching plugin at runtime. The interface exists now so that
 * the seam is real even while a single language is wired in (see the renderer
 * index and `EventsPanel`).
 *
 * A language is agnostic of the rendering target: it composes all output
 * through the abstract {@link Markup} seam, so the SAME language renders to
 * React nodes on the web or to plain text in a CLI player with no changes.
 * That keeps the concerns of defining a new language minimal — a language only
 * has to decide, per event, which sentence to narrate ({@link narrateEvent})
 * and how to fill each slot with words and grammar ({@link createRenderValue}).
 *
 * `TContext` is the language's own grammar state, threaded across a sentence
 * (e.g. the current subject/object). Owning it here means languages with
 * different grammars are not forced into a shared shape.
 */
export type Language<TContext> = {
  /** The sentence for an event, or null when the event is not narrated. */
  narrateEvent: (event: EntityEvent) => Narration | null;
  /** The starting grammar state for a fresh sentence. */
  initialContext: TContext;
  /**
   * The per-value renderer, generic over the rendering target. The app injects
   * the {@link Markup} for the current target plus the data accessors that turn
   * an entity into a name and a presentation class.
   */
  createRenderValue: <Node>(deps: {
    markup: Markup<Node>;
    getName: NarrationName;
    getClassName: NarrationClassName;
  }) => RenderValue<NarrationValue, TContext, Node>;
};

/**
 * Drives a {@link Language} against one rendering target. Generic over the
 * output `Node`, so the web client passes `reactMarkup` and a CLI player passes
 * `textMarkup` with everything else identical. Returns null for events the
 * language chooses not to narrate.
 */
export const renderEventWith = <TContext, Node>({
  language,
  markup,
  getName,
  getClassName,
}: {
  language: Language<TContext>;
  markup: Markup<Node>;
  getName: NarrationName;
  getClassName: NarrationClassName;
}): ((event: EntityEvent) => Node | null) => {
  const renderValue = language.createRenderValue({
    markup,
    getName,
    getClassName,
  });
  const compileTemplate = renderTemplate({ markup, renderValue });

  return (event) => {
    const narration = language.narrateEvent(event);
    if (narration == null) {
      return null;
    }
    return compileTemplate(narration.template)(
      narration.values,
      language.initialContext,
    );
  };
};
