import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

interface AnimatedTabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  indicatorClassName?: string;
  indicatorColor?: string;
}

const AnimatedTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  AnimatedTabsListProps
>(({ className, indicatorClassName, indicatorColor, children, ...props }, ref) => {
  const [indicatorStyle, setIndicatorStyle] = React.useState<{
    left: number;
    width: number;
  } | null>(null);
  const tabsRef = React.useRef<(HTMLButtonElement | null)[]>([]);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateIndicator = () => {
      if (!listRef.current) return;

      const activeIndex = tabsRef.current.findIndex(
        (tab) => tab?.getAttribute("data-state") === "active"
      );

      if (activeIndex === -1) {
        setIndicatorStyle(null);
        return;
      }

      const activeTab = tabsRef.current[activeIndex];
      if (!activeTab) return;

      const listRect = listRef.current.getBoundingClientRect();
      const tabRect = activeTab.getBoundingClientRect();

      setIndicatorStyle({
        left: tabRect.left - listRect.left,
        width: tabRect.width,
      });
    };

    // Initial update
    const timeoutId = setTimeout(updateIndicator, 0);

    // Use MutationObserver to watch for state changes
    const observer = new MutationObserver(updateIndicator);
    if (listRef.current) {
      observer.observe(listRef.current, {
        attributes: true,
        attributeFilter: ["data-state"],
        subtree: true,
      });
    }

    // Also listen for resize
    window.addEventListener("resize", updateIndicator);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [children]);

  // Clone children to attach refs
  const childrenWithRefs = React.useMemo(() => {
    return React.Children.map(children, (child, index) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, {
          ref: (node: HTMLButtonElement | null) => {
            tabsRef.current[index] = node;
            // Call original ref if it exists
            const originalRef = (child as any).ref;
            if (originalRef) {
              if (typeof originalRef === "function") {
                originalRef(node);
              } else if (originalRef.current !== undefined) {
                originalRef.current = node;
              }
            }
          },
        });
      }
      return child;
    });
  }, [children]);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
        listRef.current = node;
      }}
      className={cn(
        "relative inline-flex h-10 items-center justify-center p-1",
        className
      )}
      {...props}
    >
      {childrenWithRefs}
      {indicatorStyle && (
        <motion.div
          className={cn(
            "absolute h-[2px] rounded-full",
            !indicatorColor && "bg-primary",
            indicatorClassName
          )}
          style={
            indicatorColor
              ? {
                  backgroundColor: indicatorColor,
                  bottom: "0px",
                }
              : {
                  bottom: "0px",
                }
          }
          initial={false}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
        />
      )}
    </TabsPrimitive.List>
  );
});
AnimatedTabsList.displayName = TabsPrimitive.List.displayName;

const AnimatedTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-ctp-text",
        className
      )}
    {...props}
  />
));
AnimatedTabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const AnimatedTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
AnimatedTabsContent.displayName = TabsPrimitive.Content.displayName;

export {
  Tabs,
  AnimatedTabsList,
  AnimatedTabsTrigger,
  AnimatedTabsContent,
};

