import { ComponentProps } from "react";

export const Panel = (props: ComponentProps<"div">) => (
  <div {...props} className={"Panel " + (props.className ?? "")} />
);
