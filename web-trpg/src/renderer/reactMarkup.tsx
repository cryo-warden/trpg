import { Fragment, ReactNode } from "react";
import { Markup } from "./markup";

/** React fulfillment of {@link Markup}: styled runs become `<span>`s. */
export const reactMarkup: Markup<ReactNode> = {
  empty: null,
  text: (value) => value,
  styled: (className, child) => <span className={className}>{child}</span>,
  join: (nodes) => (
    <>
      {nodes.map((node, index) => (
        <Fragment key={index}>{node}</Fragment>
      ))}
    </>
  ),
};
