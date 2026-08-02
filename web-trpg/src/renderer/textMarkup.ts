import { Markup } from "./markup";

/**
 * Plain-text fulfillment of {@link Markup}. Styling hints are dropped and nodes
 * are concatenated into a string. Usable anywhere without React — e.g. a CLI
 * player.
 */
export const textMarkup: Markup<string> = {
  empty: "",
  text: (value) => value,
  styled: (_className, child) => child,
  join: (nodes) => nodes.join(""),
};
