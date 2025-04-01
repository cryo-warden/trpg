import { ComponentPropsWithoutRef, useCallback } from "react";
import "./Button.css";
import { useHotkeyRef } from "./useHotkeyRef";

export const Button = ({
  hotkey,
  children,
  className,
  onClick,
  ...props
}: {
  hotkey?: string;
} & ComponentPropsWithoutRef<"button">) => {
  const buttonRef = useHotkeyRef(hotkey);

  const handleClick: {} & typeof onClick = useCallback(
    (e) => {
      if (onClick == null) {
        return;
      }

      e.stopPropagation();
      onClick(e);
      const button = buttonRef.current;
      if (button != null) {
        setTimeout(() => {
          button.blur();
        }, 200);
      }
    },
    [buttonRef, onClick]
  );

  return (
    <button
      {...props}
      ref={buttonRef}
      className={["Button", className ?? ""].join(" ")}
      onClick={handleClick}
    >
      {children}
      {hotkey && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </button>
  );
};
