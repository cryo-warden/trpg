import { ComponentPropsWithRef } from "react";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";
import { Panel } from "../structural/Panel";

export const SelfPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const entityToken = 1n; // WIP useControllerEntityToken();
  if (entityToken == null) {
    return null;
  }

  return <EntityPanel {...props} entity={entityToken} detailed hotkey="p" />;
};
