import { useLanguageRenderer } from "./useLanguageRenderer";
import { createDebug } from "./debug";
import { createEnUs } from "./en-us";

/**
 * Rendering entry points. `useLanguageRenderer` binds a language to React;
 * `createDebug` and `createEnUs` build the available language plugins from
 * their data accessors. Choosing a language is a planned user setting — for
 * now callers pass one explicitly.
 */
export { useLanguageRenderer, createDebug, createEnUs };
