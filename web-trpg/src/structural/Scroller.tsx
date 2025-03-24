import "./Scroller.css";

import { ReactNode, useEffect, useRef, useState } from "react";

export const Scroller = ({
  children = null,
  bottomLock = false,
}: {
  children?: ReactNode;
  bottomLock?: boolean;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(bottomLock);
  const scrollToBottom = () => {
    if (ref.current != null) {
      ref.current.scrollTop =
        ref.current.scrollHeight - ref.current.clientHeight;
    }
  };
  useEffect(() => {
    if (bottomLock && isScrolledToBottom) {
      setTimeout(scrollToBottom, 0);
    }
  });

  return (
    <div className="Scroller">
      <div
        ref={ref}
        className="scrollArea"
        onScroll={(e) => {
          const element = e.currentTarget;
          if (element.scrollTop < lastScrollTopRef.current) {
            setIsScrolledToBottom(false);
          } else if (
            element.scrollTop + 10 >=
            element.scrollHeight - element.clientHeight
          ) {
            setIsScrolledToBottom(true);
          }
          lastScrollTopRef.current = element.scrollTop;
        }}
      >
        {children}
      </div>
      {bottomLock && !isScrolledToBottom && (
        <button className="scrollToBottom" onClick={scrollToBottom}>
          end
        </button>
      )}
    </div>
  );
};
