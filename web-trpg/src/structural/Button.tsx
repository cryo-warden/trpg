import { ComponentProps } from "react";
import "./Button.css";
import { useHotkeyRef } from "./useHotkeyRef";

export type ButtonProps = {
  hotkey?: string;
} & ComponentProps<"button">;

export const Button = ({
  hotkey,
  children,
  className,
  ...props
}: ButtonProps) => {
  const buttonRef = useHotkeyRef(hotkey);

  return (
    <button
      {...props}
      ref={buttonRef}
      className={["Button", className ?? ""].join(" ")}
    >
      {children}
      {hotkey && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </button>
  );
};
