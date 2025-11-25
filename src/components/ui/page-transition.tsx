import { useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";
import { Outlet } from "@tanstack/react-router";

/**
 * Wrapper component for smooth page transitions using TanStack Router
 * Uses AnimatePresence to handle enter/exit animations between routes
 */
export function PageTransition() {
  const routerState = useRouterState();
  const location = routerState.location;

  return (
    <div className="w-full bg-[#1e1e2e] min-h-screen relative">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname + location.search}
          initial="initial"
          animate="enter"
          exit="exit"
          variants={pageVariants}
          className="w-full min-h-screen"
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

