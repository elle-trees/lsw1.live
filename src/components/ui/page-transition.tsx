interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Wrapper component for page transitions
 * Optimized for instant navigation - no remounting, no flashing
 * Removed all animations for instant page switching when data is ready
 */
export function PageTransition({ children }: PageTransitionProps) {
  // No transition wrapper needed - React Router handles mounting/unmounting
  // We just need a simple container without any animation delays
  // Background ensures consistent color during page transitions on HDR displays
  return <div className="w-full bg-[#1e1e2e] min-h-screen">{children}</div>;
}

