import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";

/**
 * Wrapper component for smooth page transitions using React Router outlet pattern
 * Uses AnimatePresence to handle enter/exit animations between routes
 */
export function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();

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
          {outlet}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

