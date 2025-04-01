import "./Panel.css";
import { ComponentProps } from "react";

export type PanelProps = ComponentProps<"div">;

export const Panel = (props: PanelProps) => (
  <div {...props} className={"Panel " + (props.className ?? "")} />
);
