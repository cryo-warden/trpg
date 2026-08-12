import { useMemo, type ReactNode } from "react";
import { useActionAppearanceOf } from "../Game/context/StdbContext/assetLookup";
import { usePlayerEntity } from "../Game/context/StdbContext/components";
import { EntityEvent } from "../stdb/types";
import "./debug.css";
import { reactMarkup } from "./reactMarkup";
import { useGetClassName } from "./useGetClassName";
import { useGetName } from "./useGetName";
import { useGetPossessive } from "./useGetPossessive";
import { CreateLanguage, renderEventWith } from "./language";

/**
 * Binds a {@link Language} to the React rendering target and to the live game
 * data (names, relationship classes) for the current player's viewpoint,
 * yielding a `renderEvent` that produces React nodes.
 *
 * The language is a parameter because choosing it is a PLANNED user setting;
 * today the app passes a fixed one (see the renderer index and `EventsPanel`).
 * The language itself knows nothing about React — this hook is the only React
 * in the render path, so the same language also drives a plain-text CLI player
 * via `renderEventWith` with `textMarkup`.
 */
export const useLanguageRenderer = <TContext,>(
  createLanguage: CreateLanguage<TContext>,
) => {
  const playerEntity = usePlayerEntity();
  const getName = useGetName(playerEntity);
  const getClassName = useGetClassName(playerEntity);
  const getPossessive = useGetPossessive(playerEntity);
  const actionAppearanceOf = useActionAppearanceOf();

  const renderEvent = useMemo(() => {
    const render = renderEventWith({
      language: createLanguage({ actionAppearanceOf }),
      markup: reactMarkup,
      getName,
      getClassName,
      getPossessive,
    });
    return (event: EntityEvent): ReactNode => (
      <div className="debug renderer">{render(event)}</div>
    );
  }, [createLanguage, actionAppearanceOf, getName, getClassName, getPossessive]);

  return { renderEvent };
};
