import { ComponentPropsWithRef } from "react";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";
import { useControllerEntity } from "./context/ControllerContext";
import { Panel } from "../structural/Panel";

export const SelfPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const entity = useControllerEntity();
  if (entity == null) {
    return null;
  }

  return <EntityPanel {...props} entity={entity} detailed hotkey="p" />;
};
