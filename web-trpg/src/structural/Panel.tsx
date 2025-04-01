import "./Panel.css";
import { ComponentPropsWithRef } from "react";

export const Panel = (props: ComponentPropsWithRef<"div">) => (
  <div {...props} className={"Panel " + (props.className ?? "")} />
);
