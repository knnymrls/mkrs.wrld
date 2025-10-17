"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { useComposedRefs } from "@/lib/compose-refs";

interface MasonryRootProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * The number of columns in the masonry layout
   * @default undefined (auto)
   */
  columnCount?: number;
  /**
   * The width of each column in pixels
   * @default 280
   */
  columnWidth?: number;
  /**
   * The gap between items in pixels
   * @default 12
   */
  gap?: number;
  /**
   * Whether to use linear layout (maintain order from left to right)
   * @default false
   */
  linear?: boolean;
  /**
   * Default width for SSR
   */
  defaultWidth?: number;
  /**
   * Default height for SSR
   */
  defaultHeight?: number;
  /**
   * Fallback component to show while loading
   */
  fallback?: React.ReactNode;
}

interface MasonryItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Change the default rendered element for the one passed as a child.
   * @default false
   */
  asChild?: boolean;
  /**
   * Fallback component for this specific item
   */
  fallback?: React.ReactNode;
}

const MasonryContext = React.createContext<{
  gap: number;
  columnWidth: number;
  columnCount?: number;
  linear: boolean;
} | null>(null);

const useMasonryContext = () => {
  const context = React.useContext(MasonryContext);
  if (!context) {
    throw new Error("Masonry components must be used within MasonryRoot");
  }
  return context;
};

const MasonryRoot = React.forwardRef<HTMLDivElement, MasonryRootProps>(
  (
    {
      children,
      columnCount,
      columnWidth = 280,
      gap = 12,
      linear = false,
      defaultWidth,
      defaultHeight,
      fallback,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const [isLoaded, setIsLoaded] = React.useState(false);

    React.useEffect(() => {
      setIsLoaded(true);
    }, []);

    const masonryStyle: React.CSSProperties = {
      ...style,
      width: "100%",
      columnCount: columnCount || "auto",
      columnWidth: columnWidth,
      columnGap: gap,
      position: "relative",
      ...(!isLoaded &&
        defaultHeight && {
          minHeight: defaultHeight,
        }),
    };

    if (!isLoaded && fallback) {
      return <div className={className}>{fallback}</div>;
    }

    return (
      <MasonryContext.Provider value={{ gap, columnWidth, columnCount, linear }}>
        <div ref={ref} className={className} style={masonryStyle} {...props}>
          {children}
        </div>
      </MasonryContext.Provider>
    );
  }
);

MasonryRoot.displayName = "MasonryRoot";

const MasonryItem = React.forwardRef<HTMLDivElement, MasonryItemProps>(
  ({ asChild = false, fallback, className, style, children, ...props }, ref) => {
    const context = useMasonryContext();
    const [isVisible, setIsVisible] = React.useState(false);
    const itemRef = React.useRef<HTMLDivElement>(null);
    const composedRefs = useComposedRefs(ref, itemRef);

    React.useEffect(() => {
      setIsVisible(true);
    }, []);

    const itemStyle: React.CSSProperties = {
      ...style,
      breakInside: "avoid",
      width: "100%",
      display: "inline-block",
    };

    const Comp = asChild ? Slot : "div";

    if (!isVisible && fallback) {
      return <div style={itemStyle}>{fallback}</div>;
    }

    return (
      <Comp
        ref={composedRefs}
        className={className}
        style={itemStyle}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

MasonryItem.displayName = "MasonryItem";

export { MasonryRoot as Root, MasonryItem as Item };
