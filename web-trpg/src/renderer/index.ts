import { useLanguageRenderer } from "./useLanguageRenderer";
import { debug } from "./debug";
import { enUs } from "./en-us";

/**
 * Rendering entry points. `useLanguageRenderer` binds a language to React;
 * `debug` and `enUs` are the available language plugins. Choosing a language is
 * a planned user setting — for now callers pass one explicitly.
 */
export { useLanguageRenderer, debug, enUs };
